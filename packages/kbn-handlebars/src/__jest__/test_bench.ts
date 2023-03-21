/*
 * Elasticsearch B.V licenses this file to you under the MIT License.
 * See `packages/kbn-handlebars/LICENSE` for more information.
 */

import Handlebars, {
  type CompileOptions,
  type DecoratorDelegate,
  type HelperDelegate,
  type RuntimeOptions,
} from '../..';
import type { DecoratorsHash, HelpersHash, PartialsHash, Template } from '../types';

type CompileFns = 'compile' | 'compileAST';
const compileFns: CompileFns[] = ['compile', 'compileAST'];
if (process.env.AST) compileFns.splice(0, 1);
else if (process.env.EVAL) compileFns.splice(1, 1);

declare global {
  var kbnHandlebarsEnv: typeof Handlebars | null; // eslint-disable-line no-var
}

global.kbnHandlebarsEnv = null;

interface TestOptions {
  beforeEach?: Function;
  beforeRender?: Function;
}

export function expectTemplate(template: string, options?: TestOptions) {
  return new HandlebarsTestBench(template, options);
}

export function forEachCompileFunctionName(
  cb: (compileName: CompileFns, index: number, array: CompileFns[]) => void
) {
  compileFns.forEach(cb);
}

class HandlebarsTestBench {
  private template: string;
  private options: TestOptions;
  private compileOptions?: CompileOptions;
  private runtimeOptions?: RuntimeOptions;
  private helpers: HelpersHash = {};
  private partials: PartialsHash = {};
  private decorators: DecoratorsHash = {};
  private input: any = {};

  constructor(template: string, options: TestOptions = {}) {
    this.template = template;
    this.options = options;
  }

  withCompileOptions(compileOptions?: CompileOptions) {
    this.compileOptions = compileOptions;
    return this;
  }

  withRuntimeOptions(runtimeOptions?: RuntimeOptions) {
    this.runtimeOptions = runtimeOptions;
    return this;
  }

  withInput(input: any) {
    this.input = input;
    return this;
  }

  withHelper<F extends HelperDelegate>(name: string, helper: F) {
    this.helpers[name] = helper;
    return this;
  }

  withHelpers<F extends HelperDelegate>(helperFunctions: Record<string, F>) {
    for (const [name, helper] of Object.entries(helperFunctions)) {
      this.withHelper(name, helper);
    }
    return this;
  }

  withPartial(name: string | number, partial: Template) {
    this.partials[name] = partial;
    return this;
  }

  withPartials(partials: Record<string, Template>) {
    for (const [name, partial] of Object.entries(partials)) {
      this.withPartial(name, partial);
    }
    return this;
  }

  withDecorator(name: string, decoratorFunction: DecoratorDelegate) {
    this.decorators[name] = decoratorFunction;
    return this;
  }

  withDecorators(decoratorFunctions: Record<string, DecoratorDelegate>) {
    for (const [name, decoratorFunction] of Object.entries(decoratorFunctions)) {
      this.withDecorator(name, decoratorFunction);
    }
    return this;
  }

  toCompileTo(outputExpected: string) {
    const { outputEval, outputAST } = this.compileAndExecute();
    if (process.env.EVAL) {
      expect(outputEval).toEqual(outputExpected);
    } else if (process.env.AST) {
      expect(outputAST).toEqual(outputExpected);
    } else {
      expect(outputAST).toEqual(outputExpected);
      expect(outputAST).toEqual(outputEval);
    }
  }

  toThrow(error?: string | RegExp | jest.Constructable | Error | undefined) {
    if (process.env.EVAL) {
      expect(() => {
        this.compileAndExecuteEval();
      }).toThrowError(error);
    } else if (process.env.AST) {
      expect(() => {
        this.compileAndExecuteAST();
      }).toThrowError(error);
    } else {
      expect(() => {
        this.compileAndExecuteEval();
      }).toThrowError(error);
      expect(() => {
        this.compileAndExecuteAST();
      }).toThrowError(error);
    }
  }

  private compileAndExecute() {
    if (process.env.EVAL) {
      return {
        outputEval: this.compileAndExecuteEval(),
      };
    } else if (process.env.AST) {
      return {
        outputAST: this.compileAndExecuteAST(),
      };
    } else {
      return {
        outputEval: this.compileAndExecuteEval(),
        outputAST: this.compileAndExecuteAST(),
      };
    }
  }

  private compileAndExecuteEval() {
    const renderEval = this.compileEval();

    const runtimeOptions: RuntimeOptions = {
      helpers: this.helpers,
      partials: this.partials,
      decorators: this.decorators,
      ...this.runtimeOptions,
    };

    this.execBeforeRender();

    return renderEval(this.input, runtimeOptions);
  }

  private compileAndExecuteAST() {
    const renderAST = this.compileAST();

    const runtimeOptions: RuntimeOptions = {
      helpers: this.helpers,
      partials: this.partials,
      decorators: this.decorators,
      ...this.runtimeOptions,
    };

    this.execBeforeRender();

    return renderAST(this.input, runtimeOptions);
  }

  private compileEval(handlebarsEnv = getHandlebarsEnv()) {
    this.execBeforeEach();
    return handlebarsEnv.compile(this.template, this.compileOptions);
  }

  private compileAST(handlebarsEnv = getHandlebarsEnv()) {
    this.execBeforeEach();
    return handlebarsEnv.compileAST(this.template, this.compileOptions);
  }

  private execBeforeRender() {
    this.options.beforeRender?.();
  }

  private execBeforeEach() {
    if (this.options.beforeEach) {
      this.options.beforeEach();
    }
  }
}

function getHandlebarsEnv() {
  return kbnHandlebarsEnv || Handlebars.create();
}
