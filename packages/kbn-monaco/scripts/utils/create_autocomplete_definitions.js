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

const getPrimitives = (data) => {
  return data
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
};

const parameterIndexToLetterMap = {
  0: 'a',
  1: 'b',
  2: 'c',
  3: 'd',
  4: 'e',
  5: 'f',
};

const getMethodDescription = (methodName, parameters, returnValue) => {
  const parameterDescription = parameters.reduce((description, parameterType, index) => {
    const newParameterDescription = `${parameterType} ${parameterIndexToLetterMap[index]}`;
    const isLastParameter = parameters.length - 1 === index;

    description = `${description}${newParameterDescription}${isLastParameter ? '' : ', '}`;

    return description;
  }, '');

  // Final format will look something like this:
  // pow(double a, double b): double
  return `${methodName}(${parameterDescription}): ${returnValue}`;
};

const getPainlessClassToAutocomplete = (painlessClass) => {
  const { staticFields, fields, staticMethods, methods } = painlessClass;

  const staticFieldsAutocomplete = staticFields.map(({ name, type }) => {
    return {
      label: name,
      kind: 'property',
      documentation: `${name}: ${type}`,
      insertText: name,
    };
  });

  const fieldsAutocomplete = fields.map(({ name, type }) => {
    return {
      label: name,
      kind: 'property',
      documentation: `${name}: ${type}`,
      insertText: name,
    };
  });

  const staticMethodsAutocomplete = staticMethods.map(
    ({ name, parameters, return: returnValue }) => {
      return {
        label: name,
        kind: 'method',
        documentation: getMethodDescription(name, parameters, returnValue),
        insertText: name,
      };
    }
  );

  const methodsAutocomplete = methods.map(({ name, parameters, return: returnValue }) => {
    return {
      label: name,
      kind: 'method',
      documentation: getMethodDescription(name, parameters, returnValue),
      insertText: name,
    };
  });

  return [
    ...staticFieldsAutocomplete,
    ...staticMethodsAutocomplete,
    ...methodsAutocomplete,
    ...fieldsAutocomplete,
  ];
};

const createAutocompleteDefinitions = (contextName, painlessClasses) => {
  const formattedData = painlessClasses.map(
    ({ name, static_fields: staticFields, fields, static_methods: staticMethods, methods }) => {
      const displayName = name.split('.').pop() || name; // TODO ES to add "displayName" field so this won't be necessary
      const isType = getPrimitives(painlessClasses).includes(name);

      return {
        label: displayName,
        kind: isType ? 'type' : 'class',
        documentation: isType ? `Primitive: ${displayName}` : `Class: ${displayName}`,
        insertText: displayName,
        children: getPainlessClassToAutocomplete({ staticFields, fields, staticMethods, methods }),
      };
    }
  );

  const stringifiedData = JSON.stringify(formattedData);
  return `
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

    export const ${contextName} = ${stringifiedData};
  `;
};

module.exports = createAutocompleteDefinitions;
