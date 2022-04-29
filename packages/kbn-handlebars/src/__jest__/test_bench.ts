/*
 * Elasticsearch B.V licenses this file to you under the MIT License.
 * See `packages/kbn-handlebars/LICENSE` for more information.
 */

import Handlebars, { ExtendedCompileOptions, ExtendedRuntimeOptions } from '..';

declare global {
  var kbnHandlebarsEnv: typeof Handlebars | null; // eslint-disable-line no-var
}

global.kbnHandlebarsEnv = null;

interface TestOptions {
  beforeEach?: Function;
}

export function expectTemplate(template: string, options?: TestOptions) {
  return new HandlebarsTestBench(template, options);
}

class HandlebarsTestBench {
  private template: string;
  private options: TestOptions;
  private compileOptions?: ExtendedCompileOptions;
  private runtimeOptions?: ExtendedRuntimeOptions;
  private helpers: { [key: string]: Handlebars.HelperDelegate | undefined } = {};
  private input: any = {};

  constructor(template: string, options: TestOptions = {}) {
    this.template = template;
    this.options = options;
  }

  withCompileOptions(compileOptions?: ExtendedCompileOptions) {
    this.compileOptions = compileOptions;
    return this;
  }

  withRuntimeOptions(runtimeOptions?: ExtendedRuntimeOptions) {
    this.runtimeOptions = runtimeOptions;
    return this;
  }

  withInput(input: any) {
    this.input = input;
    return this;
  }

  withHelper(name: string, helper?: Handlebars.HelperDelegate) {
    this.helpers[name] = helper;
    return this;
  }

  withHelpers(helperFunctions: { [key: string]: Handlebars.HelperDelegate }) {
    for (const [name, helper] of Object.entries(helperFunctions)) {
      this.withHelper(name, helper);
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

  toThrowErrorMatchingSnapshot() {
    const { renderEval, renderAST } = this.compile();
    expect(() => renderEval(this.input)).toThrowErrorMatchingSnapshot();
    expect(() => renderAST(this.input)).toThrowErrorMatchingSnapshot();
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

    const runtimeOptions: ExtendedRuntimeOptions = Object.assign(
      {
        helpers: this.helpers,
      },
      this.runtimeOptions
    );

    return renderEval(this.input, runtimeOptions);
  }

  private compileAndExecuteAST() {
    const renderAST = this.compileAST();

    const runtimeOptions: ExtendedRuntimeOptions = Object.assign(
      {
        helpers: this.helpers,
      },
      this.runtimeOptions
    );

    return renderAST(this.input, runtimeOptions);
  }

  private compile() {
    const handlebarsEnv = getHandlebarsEnv();

    return {
      renderEval: this.compileEval(handlebarsEnv),
      renderAST: this.compileAST(handlebarsEnv),
    };
  }

  private compileEval(handlebarsEnv = getHandlebarsEnv()) {
    this.execBeforeEach();
    return handlebarsEnv.compile(this.template, this.compileOptions);
  }

  private compileAST(handlebarsEnv = getHandlebarsEnv()) {
    this.execBeforeEach();
    return handlebarsEnv.compileAST(this.template, this.compileOptions);
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
