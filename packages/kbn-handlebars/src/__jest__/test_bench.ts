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
      this.compileAndExecuteEval();
    }).toThrowError(error);
    expect(() => {
      this.compileAndExecuteAST();
    }).toThrowError(error);
  }

  toThrowErrorMatchingSnapshot() {
    const { renderEval, renderAST } = this.compile();
    expect(() => renderEval(this.input)).toThrowErrorMatchingSnapshot();
    expect(() => renderAST(this.input)).toThrowErrorMatchingSnapshot();
  }

  private compileAndExecute() {
    return {
      outputEval: this.compileAndExecuteEval(),
      outputAST: this.compileAndExecuteAST(),
    };
  }

  private compileAndExecuteEval() {
    const renderEval = this.compileEval();

    const runtimeOptions: ExtendedRuntimeOptions = {
      helpers: this.helpers,
    };

    return renderEval(this.input, runtimeOptions);
  }

  private compileAndExecuteAST() {
    const renderAST = this.compileAST();

    const runtimeOptions: ExtendedRuntimeOptions = {
      helpers: this.helpers,
    };

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
    return handlebarsEnv.compile(this.template, this.compileOptions);
  }

  private compileAST(handlebarsEnv = getHandlebarsEnv()) {
    return handlebarsEnv.compileAST(this.template, this.compileOptions);
  }
}

function getHandlebarsEnv() {
  return Handlebars.create();
}
