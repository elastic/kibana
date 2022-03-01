/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import Handlebars, { HelperDelegate, ExtendedCompileOptions, ExtendedRuntimeOptions } from '..';

export function expectTemplate(template: string) {
  return new HandlebarsTestBench(template);
}

class HandlebarsTestBench {
  private template: string;
  private compileOptions?: ExtendedCompileOptions;
  private helpers: { [key: string]: HelperDelegate } = {};
  private input: any;

  constructor(template: string) {
    this.template = template;
  }

  withCompileOptions(compileOptions?: ExtendedCompileOptions) {
    this.compileOptions = compileOptions;
    return this;
  }

  withInput(input: any) {
    this.input = input;
    return this;
  }

  withHelper(name: string, helper: HelperDelegate) {
    this.helpers[name] = helper;
    return this;
  }

  withHelpers(helperFunctions: { [key: string]: HelperDelegate }) {
    for (const [name, helper] of Object.entries(helperFunctions)) {
      this.withHelper(name, helper);
    }
    return this;
  }

  toCompileTo(outputExpected: string) {
    const { outputEval, outputAST } = this.compileAndExecute();
    expect(outputAST).toEqual(outputExpected);
    expect(outputAST).toEqual(outputEval);
  }

  toThrow(error?: string | RegExp | jest.Constructable | Error | undefined) {
    expect(() => {
      this.compileAndExecute();
    }).toThrowError(error);
  }

  toThrowErrorMatchingSnapshot() {
    const { renderEval, renderAST } = this.compile();
    expect(() => renderEval(this.input)).toThrowErrorMatchingSnapshot();
    expect(() => renderAST(this.input)).toThrowErrorMatchingSnapshot();
  }

  private compileAndExecute() {
    const { renderEval, renderAST } = this.compile();

    const runtimeOptions: ExtendedRuntimeOptions = {
      helpers: this.helpers,
    };

    return {
      outputEval: renderEval(this.input, runtimeOptions),
      outputAST: renderAST(this.input, runtimeOptions),
    };
  }

  private compile() {
    const handlebarsEnv = Handlebars.create();

    return {
      renderEval: handlebarsEnv.compile(this.template, this.compileOptions),
      renderAST: handlebarsEnv.compileAST(this.template, this.compileOptions),
    };
  }
}
