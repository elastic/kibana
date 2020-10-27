/*
 * Licensed to Elasticsearch B.V. under one or more contributor
 * license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright
 * ownership. Elasticsearch B.V. licenses this file to you under
 * the Apache License, Version 2.0 (the "License"); you may
 * not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { PainlessCompletionResult, PainlessCompletionItem, PainlessContext } from '../../types';
import { painlessTestContext, scoreContext, filterContext } from './context';

interface Field {
  name: string;
  type: string;
}

interface Method {
  name: string;
  parameters: string[];
  return: string;
}

interface Constructor {
  declaring: string;
  parameters: string[];
}

interface ContextClass {
  name: string;
  imported: boolean;
  constructors: Constructor[];
  static_methods: Method[];
  methods: Method[];
  static_fields: Field[];
  fields: Field[];
}

interface ClassNameMap {
  [key: string]: ContextClass;
}

interface Context {
  name: string;
  classes: ContextClass[];
}

const mapContextToData: { [key: string]: object } = {
  painless_test: painlessTestContext,
  score: scoreContext,
  filter: filterContext,
};

// TODO making the assumption there will never be >5 parameters for a method
const parameterIndexToLetterMap: {
  [key: number]: string;
} = {
  0: 'a',
  1: 'b',
  2: 'c',
  3: 'd',
  4: 'e',
  5: 'f',
};

// TODO for now assuming we will always have parameters and return value
const getMethodDescription = (
  methodName: string,
  parameters: string[],
  returnValue: string
): string => {
  const parameterDescription: string = parameters.reduce(
    (description: string, parameterType: string, index: number) => {
      const newParameterDescription = `${parameterType} ${parameterIndexToLetterMap[index]}`;
      const isLastParameter = parameters.length - 1 === index;

      description = `${description}${newParameterDescription}${isLastParameter ? '' : ', '}`;

      return description;
    },
    ''
  );

  // Final format will look something like this:
  // pow(double a, double b): double
  return `${methodName}(${parameterDescription}): ${returnValue}`;
};

export class PainlessCompletionService {
  context: Context;
  constructor(private _painlessContext: PainlessContext) {
    this.context = mapContextToData[this._painlessContext] as Context;
  }

  createClassNameMap() {
    return this.context.classes.reduce((acc: ClassNameMap, currentVal) => {
      const className = currentVal.name.split('.').pop();

      if (className) {
        acc[className] = currentVal;
      }

      return acc;
    }, {});
  }

  getTypes() {
    return this.context.classes
      .filter(
        ({
          static_fields: staticFields,
          fields,
          static_methods: staticMethods,
          methods,
          constructors,
        }) => {
          if (
            staticMethods.length === 0 &&
            methods.length === 0 &&
            staticFields.length === 0 &&
            fields.length === 0 &&
            constructors.length === 0
          ) {
            return true;
          }
        }
      )
      .map((type) => type.name);
  }

  getPainlessClassesToAutocomplete(): PainlessCompletionResult {
    const painlessClasses: PainlessCompletionItem[] = this.context.classes.map(({ name }) => {
      const className = name.split('.').pop() || name; // TODO ES to add "displayName" field so this won't be necessary
      const isType = this.getTypes().includes(name);

      return {
        label: className,
        kind: isType ? 'type' : 'class',
        documentation: `Class ${className}`,
        insertText: className,
      };
    });
    return {
      isIncomplete: false,
      suggestions: painlessClasses,
    };
  }

  getPainlessConstructorsToAutocomplete(): PainlessCompletionResult {
    const painlessConstructors = this.context.classes
      .filter(({ constructors }) => constructors.length > 0)
      .map(({ constructors }) => constructors)
      .flat();

    const constructors: PainlessCompletionItem[] = painlessConstructors
      // There are sometimes multiple definitions for the same constructor
      // This method filters them out so we don't display more than once in autocomplete
      // TODO should check with ES and see if we can improve data structure
      .filter((constructor, index, constructorArray) => {
        return (
          constructorArray.findIndex(({ declaring }) => declaring === constructor.declaring) ===
          index
        );
      })
      .map(({ declaring }) => {
        const constructorName = declaring.split('.').pop() || declaring; // TODO ES to add "displayName" field so this won't be necessary

        return {
          label: constructorName,
          kind: 'constructor',
          documentation: `Constructor ${constructorName}`,
          insertText: constructorName,
        };
      });

    return {
      isIncomplete: false,
      suggestions: constructors,
    };
  }

  getPainlessClassToAutocomplete(className: string): PainlessCompletionResult {
    const classNameMap = this.createClassNameMap();

    if (!classNameMap[className]) {
      return {
        isIncomplete: false,
        suggestions: [],
      };
    }

    const {
      static_fields: staticFields,
      fields,
      static_methods: staticMethods,
      methods,
    } = classNameMap[className];

    const staticFieldsAutocomplete: PainlessCompletionItem[] = staticFields.map(
      ({ name, type }) => {
        return {
          label: name,
          kind: 'property',
          documentation: `${name}: ${type}`,
          insertText: name,
        };
      }
    );

    const fieldsAutocomplete: PainlessCompletionItem[] = fields.map(({ name, type }) => {
      return {
        label: name,
        kind: 'property',
        documentation: `${name}: ${type}`,
        insertText: name,
      };
    });

    const staticMethodsAutocomplete: PainlessCompletionItem[] = staticMethods.map(
      ({ name, parameters, return: returnValue }) => {
        return {
          label: name,
          kind: 'method',
          documentation: getMethodDescription(name, parameters, returnValue),
          insertText: name,
        };
      }
    );

    const methodsAutocomplete: PainlessCompletionItem[] = methods.map(
      ({ name, parameters, return: returnValue }) => {
        return {
          label: name,
          kind: 'method',
          documentation: getMethodDescription(name, parameters, returnValue),
          insertText: name,
        };
      }
    );

    return {
      isIncomplete: false,
      suggestions: [
        ...staticFieldsAutocomplete,
        ...staticMethodsAutocomplete,
        ...methodsAutocomplete,
        ...fieldsAutocomplete,
      ],
    };
  }
}
