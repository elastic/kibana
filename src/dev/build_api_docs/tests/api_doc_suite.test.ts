/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import fs from 'fs';
import Path from 'path';
import { Project } from 'ts-morph';
import { REPO_ROOT } from '@kbn/utils';
import { ToolingLog, KibanaPlatformPlugin } from '@kbn/dev-utils';

import { writePluginDocs } from '../mdx/write_plugin_mdx_docs';
import { ApiDeclaration, PluginApi, TextWithLinks, TypeKind } from '../types';
import { getKibanaPlatformPlugin } from './kibana_platform_plugin_mock';
import { getPluginApi } from '../get_plugin_api';

const log = new ToolingLog({
  level: 'debug',
  writeTo: process.stdout,
});

let doc: PluginApi;
let mdxOutputFolder: string;

function linkCount(signature: TextWithLinks): number {
  return signature.reduce((cnt, next) => (typeof next === 'string' ? cnt : cnt + 1), 0);
}

function fnIsCorrect(fn: ApiDeclaration | undefined) {
  expect(fn).toBeDefined();
  expect(fn?.type).toBe(TypeKind.FunctionKind);
  // The signature should contain a link to ExampleInterface param.
  expect(fn?.signature).toBeDefined();
  expect(linkCount(fn!.signature!)).toBe(3);

  expect(fn?.children!.length).toBe(5);
  expect(fn?.returnComment!.length).toBe(1);

  const p1 = fn?.children!.find((c) => c.label === 'a');
  expect(p1).toBeDefined();
  expect(p1!.type).toBe(TypeKind.StringKind);
  expect(p1!.isRequired).toBe(true);
  expect(p1!.signature?.length).toBe(1);
  expect(linkCount(p1!.signature!)).toBe(0);

  const p2 = fn?.children!.find((c) => c.label === 'b');
  expect(p2).toBeDefined();
  expect(p2!.isRequired).toBe(false);
  expect(p2!.type).toBe(TypeKind.NumberKind);
  expect(p2!.signature?.length).toBe(1);
  expect(linkCount(p2!.signature!)).toBe(0);

  const p3 = fn?.children!.find((c) => c.label === 'c');
  expect(p3).toBeDefined();
  expect(p3!.isRequired).toBe(true);
  expect(p3!.type).toBe(TypeKind.ArrayKind);
  expect(linkCount(p3!.signature!)).toBe(1);

  const p4 = fn?.children!.find((c) => c.label === 'd');
  expect(p4).toBeDefined();
  expect(p4!.isRequired).toBe(true);
  expect(p4!.type).toBe(TypeKind.CompoundTypeKind);
  expect(p4!.signature?.length).toBe(1);
  expect(linkCount(p4!.signature!)).toBe(1);

  const p5 = fn?.children!.find((c) => c.label === 'e');
  expect(p5).toBeDefined();
  expect(p5!.isRequired).toBe(false);
  expect(p5!.type).toBe(TypeKind.StringKind);
  expect(p5!.signature?.length).toBe(1);
  expect(linkCount(p5!.signature!)).toBe(0);
}

beforeAll(() => {
  const tsConfigFilePath = Path.resolve(
    REPO_ROOT,
    'src',
    'dev',
    'build_api_docs',
    'tests',
    'src',
    'tsconfig.json'
  );
  const project = new Project({
    tsConfigFilePath,
  });

  expect(project.getSourceFiles().length).toBeGreaterThan(0);

  const pluginA = getKibanaPlatformPlugin('pluginA', 'plugin_a');
  pluginA.manifest.serviceFolders = ['foo'];
  const plugins: KibanaPlatformPlugin[] = [pluginA];

  doc = getPluginApi(project, plugins[0], plugins, log);
  mdxOutputFolder = Path.resolve(REPO_ROOT, 'src', 'dev', 'build_api_docs', 'tests', 'snapshots');
  writePluginDocs(mdxOutputFolder, doc, log);
});

it('Setup type is extracted', () => {
  expect(doc.client.setup).toBeDefined();
});

it('service mdx file was created', () => {
  expect(fs.existsSync(Path.resolve(mdxOutputFolder, 'plugin_a_foo.mdx'))).toBe(true);
});

it('Setup type has comment', () => {
  expect(doc.client.setup!.description).toBeDefined();
  expect(doc.client.setup!.description).toMatchInlineSnapshot(`
    Array [
      "
    Access setup functionality from your plugin's setup function by adding the example
    plugin as a dependency.

    \`\`\`ts
    Class MyPlugin {
      setup(core: CoreDependencies, { example }: PluginDependencies) {
        // Here you can access this functionality.
        example.getSearchService();
      }
    }
    \`\`\`",
    ]
  `);
});

it('const exported from common folder is correct', () => {
  const fooConst = doc.common.misc.find((c) => c.label === 'commonFoo');
  expect(fooConst).toBeDefined();

  expect(fooConst!.source.path.indexOf('src/plugin_a/common/foo/index.ts')).toBeGreaterThanOrEqual(
    0
  );
  expect(fooConst!.signature![0]).toBe('"COMMON VAR!"');
});

describe('functions', () => {
  it('arrow function is exported correctly', () => {
    const fn = doc.client.functions.find((c) => c.label === 'arrowFn');
    // Using the same data as the not an arrow function so this is refactored.
    fnIsCorrect(fn);
  });

  it('non arrow function is exported correctly', () => {
    const fn = doc.client.functions.find((c) => c.label === 'notAnArrowFn');
    // Using the same data as the arrow function so this is refactored.
    fnIsCorrect(fn);
  });

  it('crazyFunction is typed correctly', () => {
    const fn = doc.client.functions!.find((c) => c.label === 'crazyFunction');

    expect(fn).toBeDefined();

    const obj = fn?.children?.find((c) => c.label === 'obj');
    expect(obj).toBeDefined();
    expect(obj!.children?.length).toBe(1);

    const hi = obj?.children?.find((c) => c.label === 'hi');
    expect(hi).toBeDefined();

    const obj2 = fn?.children?.find((c) => c.label === '{ fn }');
    expect(obj2).toBeDefined();
    expect(obj2!.children?.length).toBe(1);

    const fn2 = obj2?.children?.find((c) => c.label === 'fn');
    expect(fn2).toBeDefined();
    expect(fn2?.type).toBe(TypeKind.FunctionKind);
  });
});

describe('objects', () => {
  it('Object exported correctly', () => {
    const obj = doc.client.objects.find((c) => c.label === 'aPretendNamespaceObj');
    expect(obj).toBeDefined();

    const fn = obj?.children?.find((c) => c.label === 'notAnArrowFn');
    expect(fn?.signature).toBeDefined();
    // Should just be typeof notAnArrowFn.
    expect(linkCount(fn?.signature!)).toBe(1);
    // Comment should be the inline one.
    expect(fn?.description).toMatchInlineSnapshot(`
      Array [
        "/**
         * The docs should show this inline comment.
         */
      ",
      ]
    `);

    const fn2 = obj?.children?.find((c) => c.label === 'aPropertyInlineFn');
    expect(fn2?.signature).toBeDefined();
    // Should include 2 links to ImAType
    expect(linkCount(fn2?.signature!)).toBe(2);
    expect(fn2?.children).toBeDefined();

    const nestedObj = obj?.children?.find((c) => c.label === 'nestedObj');
    // We aren't giving objects a signature. The children should contain all the information.
    expect(nestedObj?.signature).toBeUndefined();
    expect(nestedObj?.children).toBeDefined();
    expect(nestedObj?.type).toBe(TypeKind.ObjectKind);
    const foo = nestedObj?.children?.find((c) => c.label === 'foo');
    expect(foo?.type).toBe(TypeKind.StringKind);
  });
});

describe('Misc types', () => {
  it('Explicitly typed array is returned with the correct type', () => {
    const aStrArray = doc.client.misc.find((c) => c.label === 'aStrArray');
    expect(aStrArray).toBeDefined();
    expect(aStrArray?.type).toBe(TypeKind.ArrayKind);
  });

  it('Implicitly typed array is returned with the correct type', () => {
    const aNumArray = doc.client.misc.find((c) => c.label === 'aNumArray');
    expect(aNumArray).toBeDefined();
    expect(aNumArray?.type).toBe(TypeKind.ArrayKind);
  });

  it('Explicitly typed string is returned with the correct type', () => {
    const aStr = doc.client.misc.find((c) => c.label === 'aStr');
    expect(aStr).toBeDefined();
    expect(aStr?.type).toBe(TypeKind.StringKind);
    // signature would be the same as type, so it should be removed.
    expect(aStr?.signature).toBeUndefined();
  });

  it('Implicitly typed number is returned with the correct type', () => {
    const aNum = doc.client.misc.find((c) => c.label === 'aNum');
    expect(aNum).toBeDefined();
    expect(aNum?.type).toBe(TypeKind.NumberKind);
  });

  it('aUnionProperty is exported as a CompoundType with a call signature', () => {
    const prop = doc.client.misc.find((c) => c.label === 'aUnionProperty');
    expect(prop).toBeDefined();
    expect(prop?.type).toBe(TypeKind.CompoundTypeKind);
    expect(linkCount(prop?.signature!)).toBe(1);
  });

  it('Function type is exported correctly', () => {
    const fnType = doc.client.misc.find((c) => c.label === 'FnWithGeneric');
    expect(fnType).toBeDefined();
    expect(fnType?.type).toBe(TypeKind.TypeKind);
    expect(fnType?.signature!).toMatchInlineSnapshot(`
      Array [
        "<T>(t: T) => TypeWithGeneric<T>",
      ]
    `);

    // This is a known bug, links are not captured. https://github.com/dsherret/ts-morph/issues/923
    // TODO: if we can fix this bug, uncomment this line.
    // expect(linkCount(fnType?.signature!)).toBe(1);
  });
});

describe('interfaces and classes', () => {
  it('Basic interface exported correctly', () => {
    const anInterface = doc.client.interfaces.find((c) => c.label === 'IReturnAReactComponent');
    expect(anInterface).toBeDefined();

    // Make sure it doesn't include a self referential link.
    expect(anInterface?.signature).toBeUndefined();
  });

  it('Interface which extends exported correctly', () => {
    const exampleInterface = doc.client.interfaces.find((c) => c.label === 'ExampleInterface');
    expect(exampleInterface).toBeDefined();
    expect(exampleInterface?.signature).toBeDefined();
    expect(exampleInterface?.type).toBe(TypeKind.InterfaceKind);

    expect(linkCount(exampleInterface?.signature!)).toBe(1);

    // TODO: uncomment if the bug is fixed.
    // This is wrong, the link should be to `AnotherInterface`
    // Another bug, this link is not being captured.
    // expect(exampleInterface?.signature).toMatchInlineSnapshot(`
    //   Array [
    //     "",
    //     Object {
    //       "docId": "kibPluginAPluginApi",
    //       "section": "def-public.ExampleInterface",
    //       "text": "ExampleInterface",
    //     },
    //     " extends AnotherInterface<string>",
    //   ]
    // `);
    // expect(typeof exampleInterface!.signature![2]).toBe('Object');
  });

  it('Non arrow function on interface is exported as function type', () => {
    const exampleInterface = doc.client.interfaces.find((c) => c.label === 'ExampleInterface');
    expect(exampleInterface).toBeDefined();

    const fn = exampleInterface!.children?.find((c) => c.label === 'aFn');
    expect(fn).toBeDefined();
    expect(fn?.type).toBe(TypeKind.FunctionKind);
  });

  it('Class exported correctly', () => {
    const clss = doc.client.classes.find((c) => c.label === 'CrazyClass');
    expect(clss).toBeDefined();
    expect(clss?.signature).toBeDefined();
    expect(clss?.type).toBe(TypeKind.ClassKind);
    expect(clss?.signature).toMatchInlineSnapshot(`
      Array [
        Object {
          "docId": "kibPluginAPluginApi",
          "section": "def-public.CrazyClass",
          "text": "CrazyClass",
        },
        "<P> extends ExampleClass<WithGen<P>>",
      ]
    `);
    expect(clss?.signature?.length).toBe(2);
  });

  it('Function with generic inside interface is exported with function type', () => {
    const exampleInterface = doc.client.interfaces.find((c) => c.label === 'ExampleInterface');
    expect(exampleInterface).toBeDefined();

    const fnWithGeneric = exampleInterface?.children?.find((c) => c.label === 'aFnWithGen');
    expect(fnWithGeneric).toBeDefined();
    expect(fnWithGeneric?.type).toBe(TypeKind.FunctionKind);
  });
});
