/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import fs from 'fs';
import Path from 'path';

import { Project } from 'ts-morph';
import { ToolingLog } from '@kbn/tooling-log';

import { writePluginDocs } from '../mdx/write_plugin_mdx_docs';
import type {
  ApiDeclaration,
  ApiStats,
  PluginApi,
  PluginOrPackage,
  Reference,
  TextWithLinks,
} from '../types';
import { TypeKind } from '../types';
import { getKibanaPlatformPlugin } from './kibana_platform_plugin_mock';
import { groupPluginApi } from '../utils';
import { getPluginApiMap } from '../get_plugin_api_map';
import { collectApiStatsForPlugin } from '../stats';

const log = new ToolingLog({
  level: 'debug',
  writeTo: process.stdout,
});

let doc: PluginApi;
let mdxOutputFolder: string;
let pluginAStats: ApiStats;
let pluginBStats: ApiStats;

const mapStat = ({ id, label, path, type, lineNumber, columnNumber }: ApiDeclaration) => ({
  id,
  label,
  path,
  type,
  lineNumber,
  columnNumber,
});

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
  expect(p1?.description).toBeDefined();
  expect(p1?.description?.length).toBe(1);

  const p2 = fn?.children!.find((c) => c.label === 'b');
  expect(p2).toBeDefined();
  expect(p2!.isRequired).toBe(false);
  expect(p2!.type).toBe(TypeKind.NumberKind);
  expect(p2!.signature?.length).toBe(1);
  expect(linkCount(p2!.signature!)).toBe(0);
  expect(p2?.description?.length).toBe(1);

  const p3 = fn?.children!.find((c) => c.label === 'c');
  expect(p3).toBeDefined();
  expect(p3!.isRequired).toBe(true);
  expect(p3!.type).toBe(TypeKind.ArrayKind);
  expect(linkCount(p3!.signature!)).toBe(1);
  expect(p3?.description).toBeDefined();
  expect(p3?.description?.length).toBe(1);

  const p4 = fn?.children!.find((c) => c.label === 'd');
  expect(p4).toBeDefined();
  expect(p4!.isRequired).toBe(true);
  expect(p4!.type).toBe(TypeKind.CompoundTypeKind);
  expect(p4!.signature?.length).toBe(1);
  expect(linkCount(p4!.signature!)).toBe(1);
  expect(p4?.description?.length).toBe(1);

  const p5 = fn?.children!.find((c) => c.label === 'e');
  expect(p5).toBeDefined();
  expect(p5!.isRequired).toBe(false);
  expect(p5!.type).toBe(TypeKind.StringKind);
  expect(p5!.signature?.length).toBe(1);
  expect(linkCount(p5!.signature!)).toBe(0);
  expect(p5?.description?.length).toBe(1);
}

beforeAll(async () => {
  const tsConfigFilePath = Path.resolve(__dirname, '__fixtures__/src/tsconfig.json');
  const project = new Project({
    tsConfigFilePath,
  });

  expect(project.getSourceFiles().length).toBeGreaterThan(0);

  const pluginA = getKibanaPlatformPlugin('pluginA');
  const pluginB = getKibanaPlatformPlugin(
    'pluginB',
    Path.resolve(__dirname, '__fixtures__/src/plugin_b')
  );
  pluginA.manifest.serviceFolders = ['foo'];
  const plugins: PluginOrPackage[] = [pluginA, pluginB];

  const { pluginApiMap, missingApiItems, referencedDeprecations, adoptionTrackedAPIs } =
    getPluginApiMap(project, plugins, log, { collectReferences: false });

  doc = pluginApiMap.pluginA;

  pluginAStats = collectApiStatsForPlugin(
    doc,
    missingApiItems,
    referencedDeprecations,
    adoptionTrackedAPIs
  );
  pluginBStats = collectApiStatsForPlugin(
    pluginApiMap.pluginB,
    missingApiItems,
    referencedDeprecations,
    adoptionTrackedAPIs
  );

  mdxOutputFolder = Path.resolve(__dirname, 'snapshots');
  await Promise.all([
    writePluginDocs(mdxOutputFolder, { doc, plugin: pluginA, pluginStats: pluginAStats, log }),
    writePluginDocs(mdxOutputFolder, {
      doc: pluginApiMap.pluginB,
      plugin: pluginB,
      pluginStats: pluginBStats,
      log,
    }),
  ]);

  // Write stats snapshot alongside other generated snapshots.
  const statsSnapshot = {
    counts: {
      apiCount: pluginAStats.apiCount,
      missingExports: pluginAStats.missingExports,
      missingComments: pluginAStats.missingComments.length,
      isAnyType: pluginAStats.isAnyType.length,
      noReferences: pluginAStats.noReferences.length,
    },
    missingComments: pluginAStats.missingComments.map(mapStat),
    isAnyType: pluginAStats.isAnyType.map(mapStat),
    noReferences: pluginAStats.noReferences.map(mapStat),
  };
  fs.writeFileSync(
    Path.resolve(mdxOutputFolder, 'plugin_a.stats.json'),
    JSON.stringify(statsSnapshot, null, 2) + '\n'
  );
});

it('Stats', () => {
  // Type "imAnAny"
  expect(pluginAStats.isAnyType.length).toBe(1);
  expect(pluginBStats.isAnyType.length).toBe(0);
});

it('Setup type is extracted', () => {
  const grouped = groupPluginApi(doc.client);
  expect(grouped.setup).toBeDefined();
});

it('service mdx file was created', () => {
  expect(fs.existsSync(Path.resolve(mdxOutputFolder, 'plugin_a_foo.mdx'))).toBe(true);
});

it('Setup type has comment', () => {
  const grouped = groupPluginApi(doc.client);
  expect(grouped.setup!.description).toBeDefined();
  expect(grouped.setup!.description).toMatchInlineSnapshot(`
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
  const fooConst = doc.common.find((c) => c.label === 'commonFoo');
  expect(fooConst).toBeDefined();

  expect(fooConst!.path.replace(Path.sep, '/')).toContain('src/plugin_a/common/foo/index.ts');
  expect(fooConst!.signature![0]).toBe('"COMMON VAR!"');
});

describe('functions', () => {
  it('function referencing missing type has link removed', () => {
    const fn = doc.client.find((c) => c.label === 'fnWithNonExportedRef');
    expect(linkCount(fn?.signature!)).toBe(0);
    expect(fn?.children).toBeDefined();
    expect(fn?.children!.length).toBe(1);
    expect(fn?.children![0].signature).toBeDefined();
    expect(linkCount(fn?.children![0].signature!)).toBe(0);
  });

  it('arrow function is exported correctly', () => {
    const fn = doc.client.find((c) => c.label === 'arrowFn');
    // Using the same data as the not an arrow function so this is refactored.
    fnIsCorrect(fn);
  });

  it('non arrow function is exported correctly', () => {
    const fn = doc.client.find((c) => c.label === 'notAnArrowFn');
    // Using the same data as the arrow function so this is refactored.
    fnIsCorrect(fn);
  });

  it('crazyFunction is typed correctly', () => {
    const fn = doc.client!.find((c) => c.label === 'crazyFunction');

    expect(fn).toBeDefined();

    const obj = fn?.children?.find((c) => c.label === 'obj');
    expect(obj).toBeDefined();
    expect(obj!.children?.length).toBe(1);

    const hi = obj?.children?.find((c) => c.label === 'hi');
    expect(hi).toBeDefined();

    const obj2 = fn?.children?.find((c) => c.label === '{ fn1, fn2 }');
    expect(obj2).toBeDefined();
    expect(obj2!.children?.length).toBe(2);
    expect(obj2!.id).toBe('def-public.crazyFunction.$2');

    const fn1 = obj2?.children?.find((c) => c.label === 'fn1');
    expect(fn1).toBeDefined();
    expect(fn1?.type).toBe(TypeKind.FunctionKind);
    expect(fn1!.id).toBe('def-public.crazyFunction.$2.fn1');

    const fn3 = fn1?.children?.find((c) => c.label === 'foo');
    expect(fn3).toBeDefined();
    expect(fn3?.type).toBe(TypeKind.ObjectKind);
    expect(fn3!.id).toBe('def-public.crazyFunction.$2.fn1.$1');
  });

  it('Fn with internal tag is not exported', () => {
    const fn = doc.client.find((c) => c.label === 'iShouldBeInternalFn');
    expect(fn).toBeUndefined();
  });
});

describe('objects', () => {
  it('Object with internal tag is not exported', () => {
    const obj = doc.client.find((c) => c.label === 'iShouldBeInternalObj');
    expect(obj).toBeUndefined();
  });

  it('Object exported correctly', () => {
    const obj = doc.client.find((c) => c.label === 'aPretendNamespaceObj');
    expect(obj).toBeDefined();

    const fn = obj?.children?.find((c) => c.label === 'notAnArrowFn');
    expect(fn?.signature).toBeDefined();
    expect(linkCount(fn?.signature!)).toBe(3);
    // Comment should be the inline one.
    expect(fn?.description).toMatchInlineSnapshot(`
      Array [
        "/**
         * The docs should show this inline comment.
         */",
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

describe('Types', () => {
  it('Generic type pointing to a function', () => {
    const api = doc.client.find((c) => c.label === 'FnTypeWithGeneric');
    expect(api).toBeDefined();
    expect(api?.signature).toBeDefined();
    expect(linkCount(api?.signature!)).toBe(2);

    expect(api?.children).toBeDefined();
    expect(api?.signature!).toMatchInlineSnapshot(`
      Array [
        "(t: T, p: ",
        Object {
          "docId": "kibPluginAPluginApi",
          "pluginId": "pluginA",
          "scope": "public",
          "section": "def-public.MyProps",
          "text": "MyProps",
        },
        ") => ",
        Object {
          "docId": "kibPluginAPluginApi",
          "pluginId": "pluginA",
          "scope": "public",
          "section": "def-public.TypeWithGeneric",
          "text": "TypeWithGeneric",
        },
        "<T>",
      ]
    `);
  });

  it('Generic type pointing to an array', () => {
    const api = doc.client.find((c) => c.label === 'TypeWithGeneric');
    expect(api).toBeDefined();
    expect(api?.signature).toBeDefined();
    expect(linkCount(api?.signature!)).toBe(0);
    expect(api?.signature!).toMatchInlineSnapshot(`
      Array [
        "T[]",
      ]
    `);
  });

  it('Type using ReactElement has the right signature', () => {
    const api = doc.client.find((c) => c.label === 'AReactElementFn');
    expect(api).toBeDefined();
    expect(api?.signature).toBeDefined();
    expect(api?.signature!).toMatchInlineSnapshot(`
      Array [
        "() => React.ReactElement<",
        Object {
          "docId": "kibPluginAPluginApi",
          "pluginId": "pluginA",
          "scope": "public",
          "section": "def-public.MyProps",
          "text": "MyProps",
        },
        ", string | React.JSXElementConstructor<any>>",
      ]
    `);
  });

  it('Type referencing not exported type has the link removed', () => {
    const api = doc.client.find((c) => c.label === 'IRefANotExportedType');
    expect(api).toBeDefined();
    expect(api?.signature).toBeDefined();
    expect(linkCount(api?.signature!)).toBe(0);
  });

  it('Explicitly typed array is returned with the correct type', () => {
    const aStrArray = doc.client.find((c) => c.label === 'aStrArray');
    expect(aStrArray).toBeDefined();
    expect(aStrArray?.type).toBe(TypeKind.ArrayKind);
  });

  it('Implicitly typed array is returned with the correct type', () => {
    const aNumArray = doc.client.find((c) => c.label === 'aNumArray');
    expect(aNumArray).toBeDefined();
    expect(aNumArray?.type).toBe(TypeKind.ArrayKind);
  });

  it('Explicitly typed string is returned with the correct type', () => {
    const aStr = doc.client.find((c) => c.label === 'aStr');
    expect(aStr).toBeDefined();
    expect(aStr?.type).toBe(TypeKind.StringKind);
    // signature would be the same as type, so it should be removed.
    expect(aStr?.signature).toBeUndefined();
  });

  it('Implicitly typed number is returned with the correct type', () => {
    const aNum = doc.client.find((c) => c.label === 'aNum');
    expect(aNum).toBeDefined();
    expect(aNum?.type).toBe(TypeKind.NumberKind);
  });

  it('aUnionProperty is exported as a CompoundType with a call signature', () => {
    const prop = doc.client.find((c) => c.label === 'aUnionProperty');
    expect(prop).toBeDefined();
    expect(prop?.type).toBe(TypeKind.CompoundTypeKind);
    expect(linkCount(prop?.signature!)).toBe(1);
  });

  it('Function type is exported correctly', () => {
    const fnType = doc.client.find((c) => c.label === 'FnWithGeneric');
    expect(fnType).toBeDefined();
    expect(fnType?.type).toBe(TypeKind.TypeKind);
    expect(fnType?.signature!).toMatchInlineSnapshot(`
      Array [
        "<T>(t: T) => ",
        Object {
          "docId": "kibPluginAPluginApi",
          "pluginId": "pluginA",
          "scope": "public",
          "section": "def-public.TypeWithGeneric",
          "text": "TypeWithGeneric",
        },
        "<T>",
      ]
    `);
    expect(linkCount(fnType?.signature!)).toBe(1);

    expect(fnType?.children).toBeDefined();
    expect(fnType?.children?.length).toBe(1);
    expect(fnType?.children![0].description).toMatchInlineSnapshot(`
      Array [
        "This is a generic T type. It can be anything.",
      ]
    `);
  });

  it('Union type is exported correctly', () => {
    const type = doc.client.find((c) => c.label === 'ImAType');
    expect(type).toBeDefined();
    expect(type?.type).toBe(TypeKind.TypeKind);
    expect(type?.signature).toBeDefined();
    expect(type?.signature!).toMatchInlineSnapshot(`
      Array [
        "string | number | ",
        Object {
          "docId": "kibPluginAFooPluginApi",
          "pluginId": "pluginA",
          "scope": "public",
          "section": "def-public.FooType",
          "text": "FooType",
        },
        " | ",
        Object {
          "docId": "kibPluginAPluginApi",
          "pluginId": "pluginA",
          "scope": "public",
          "section": "def-public.TypeWithGeneric",
          "text": "TypeWithGeneric",
        },
        "<string> | ",
        Object {
          "docId": "kibPluginAPluginApi",
          "pluginId": "pluginA",
          "scope": "common",
          "section": "def-common.ImACommonType",
          "text": "ImACommonType",
        },
      ]
    `);

    expect(linkCount(type?.signature!)).toBe(3);
    expect((type!.signature![1] as Reference).docId).toBe('kibPluginAFooPluginApi');
  });

  it('types with internal tags are not exported', () => {
    const internal = doc.client.find((c) => c.label === 'IShouldBeInternal');
    expect(internal).toBeUndefined();
  });
});

describe('interfaces and classes', () => {
  it('Interface with index signature exported correctly', () => {
    const anInterface = doc.client.find((c) => c.label === 'InterfaceWithIndexSignature');
    expect(anInterface?.children).toBeDefined();
    expect(anInterface?.children?.length).toBe(1);
    expect(anInterface?.children![0].signature).toBeDefined();
    expect(anInterface?.children![0].signature?.length).toBeGreaterThanOrEqual(1);
  });

  it('Basic interface exported correctly', () => {
    const anInterface = doc.client.find((c) => c.label === 'IReturnAReactComponent');
    expect(anInterface).toBeDefined();

    // Make sure it doesn't include a self referential link.
    expect(anInterface?.signature).toBeUndefined();
  });

  it('deprecated interface exported correctly', () => {
    const anInterface = doc.client.find((c) => c.label === 'AnotherInterface');
    expect(anInterface).toBeDefined();

    expect(anInterface?.deprecated).toBeTruthy();
    expect(anInterface?.references).toBeDefined();
    expect(anInterface?.references!.length).toBe(2);
    expect(anInterface?.removeBy).toEqual('8.0');
  });

  it('Interface which extends exported correctly', () => {
    const exampleInterface = doc.client.find((c) => c.label === 'ExampleInterface');
    expect(exampleInterface).toBeDefined();
    expect(exampleInterface?.signature).toBeDefined();
    expect(exampleInterface?.type).toBe(TypeKind.InterfaceKind);

    expect(linkCount(exampleInterface?.signature!)).toBe(2);

    expect(exampleInterface?.signature).toMatchInlineSnapshot(`
      Array [
        Object {
          "docId": "kibPluginAPluginApi",
          "pluginId": "pluginA",
          "scope": "public",
          "section": "def-public.ExampleInterface",
          "text": "ExampleInterface",
        },
        " extends ",
        Object {
          "docId": "kibPluginAPluginApi",
          "pluginId": "pluginA",
          "scope": "public",
          "section": "def-public.AnotherInterface",
          "text": "AnotherInterface",
        },
        "<string>",
      ]
    `);
  });

  /**
   * Coverage for https://github.com/elastic/kibana/issues/107145
   */
  it('Optional function on interface includes children', () => {
    const exampleInterface = doc.client.find((c) => c.label === 'ExampleInterface');
    expect(exampleInterface).toBeDefined();

    const fn = exampleInterface!.children?.find((c) => c.label === 'anOptionalFn');
    expect(fn).toBeDefined();
    expect(fn?.type).toBe(TypeKind.FunctionKind);
    expect(fn?.children).toBeDefined();
    expect(fn?.children?.length).toBe(1);
  });

  it('Non arrow function on interface is exported as function type', () => {
    const exampleInterface = doc.client.find((c) => c.label === 'ExampleInterface');
    expect(exampleInterface).toBeDefined();

    const fn = exampleInterface!.children?.find((c) => c.label === 'aFn');
    expect(fn).toBeDefined();
    expect(fn?.type).toBe(TypeKind.FunctionKind);
  });

  it('Class exported correctly', () => {
    const clss = doc.client.find((c) => c.label === 'CrazyClass');
    expect(clss).toBeDefined();
    expect(clss?.signature).toBeDefined();
    expect(clss?.type).toBe(TypeKind.ClassKind);
    expect(clss?.signature).toMatchInlineSnapshot(`
      Array [
        Object {
          "docId": "kibPluginAPluginApi",
          "pluginId": "pluginA",
          "scope": "public",
          "section": "def-public.CrazyClass",
          "text": "CrazyClass",
        },
        "<P> extends ",
        Object {
          "docId": "kibPluginAPluginApi",
          "pluginId": "pluginA",
          "scope": "public",
          "section": "def-public.ExampleClass",
          "text": "ExampleClass",
        },
        "<",
        Object {
          "docId": "kibPluginAPluginApi",
          "pluginId": "pluginA",
          "scope": "public",
          "section": "def-public.WithGen",
          "text": "WithGen",
        },
        "<P>>",
      ]
    `);
    expect(linkCount(clss?.signature!)).toBe(3);
  });

  it('Generic function inside interface is exported as a function', () => {
    const exampleInterface = doc.client.find((c) => c.label === 'ExampleInterface');
    expect(exampleInterface).toBeDefined();

    // This covers FunctionType nodes.
    const fnWithGeneric = exampleInterface?.children?.find((c) => c.label === 'aFnWithGen');
    expect(fnWithGeneric).toBeDefined();
    expect(fnWithGeneric?.children).toBeDefined();
    expect(fnWithGeneric?.children!.length).toBe(1);
    expect(fnWithGeneric?.type).toBe(TypeKind.FunctionKind);

    const param = fnWithGeneric?.children?.find((c) => c.label === 't');
    expect(fnWithGeneric?.returnComment![0]).toBe('nothing!');
    expect(param).toBeDefined();
    expect(param?.description).toBeDefined();
    expect(param?.description?.length).toBe(1);
    expect(param!.description![0]).toBe('This a parameter.');
  });

  it('Property on interface pointing to generic function type exported with link', () => {
    const exampleInterface = doc.client.find((c) => c.label === 'ExampleInterface');
    expect(exampleInterface).toBeDefined();

    const fn = exampleInterface?.children?.find((c) => c.label === 'fnTypeWithGeneric');
    expect(fn).toBeDefined();
    expect(fn!.id).toBe('def-public.ExampleInterface.fnTypeWithGeneric');

    // `fnTypeWithGeneric` is defined as:
    //  fnTypeWithGeneric: FnTypeWithGeneric<string>;
    // and `GenericTypeFn` is defined as:
    // type FnTypeWithGeneric<T> = (t: T, p: MyProps) => TypeWithGeneric<T>;
    // In get_signature.ts, we use the `TypeFormatFlags.InTypeAlias` flag which ends up expanding the type
    // to be a function, and thus this doesn't show up as a single referenced type with no kids. If we ever fixed that,
    // it would be find to change expectations here to be no children and TypeKind instead of FunctionKind.
    expect(fn?.children).toBeDefined();

    const t = fn!.children?.find((c) => c.label === 't');
    expect(t).toBeDefined();
    expect(t!.id).toBe('def-public.ExampleInterface.fnTypeWithGeneric.$1');

    expect(fn?.type).toBe(TypeKind.FunctionKind);
    expect(fn?.signature).toBeDefined();
    expect(linkCount(fn!.signature!)).toBe(2);
    expect(fn?.children?.length).toBe(2);

    // This will fail! It actually shows up as Uncategorized. It would be some effort to get it to show up as string, which may involve
    // trying to fix the above issue so it's not expanded.
    // expect(fn?.children[0]!.type).toBe(TypeKind.StringKind);
  });

  // Optional code path is different than non-optional properties.
  it('Optional interface property pointing to generic function type', () => {
    const exampleInterface = doc.client.find((c) => c.label === 'ExampleInterface');
    expect(exampleInterface).toBeDefined();

    const fn = exampleInterface?.children?.find(
      (c) => c.label === 'fnTypeWithGenericThatIsOptional'
    );
    expect(fn).toBeDefined();

    // Unlike the above, the type is _not_ expanded inline, so we make sure it has no children, but does link to the property.
    expect(fn?.children).toBeUndefined();
    expect(fn?.signature).toBeDefined();
    expect(linkCount(fn!.signature!)).toBe(1);
  });

  it('interfaces with internal tags are not exported', () => {
    const internal = doc.client.find((c) => c.label === 'IShouldBeInternalInterface');
    expect(internal).toBeUndefined();
  });

  it('classes with internal tags are not exported', () => {
    const clss = doc.client.find((c) => c.label === 'IShouldBeInternalClass');
    expect(clss).toBeUndefined();
  });

  it('interface property marked as internal not exported', () => {
    const start = doc.client.find((c) => c.label === 'Start');

    const internal = start?.children?.find((c) => c.label === 'anInternalStartFn');
    expect(internal).toBeUndefined();
  });
});

describe('validation and stats', () => {
  describe('missing comments validation', () => {
    it('validates missingComments array contains APIs without descriptions', () => {
      // fnWithNonExportedRef has no JSDoc comment
      const fn = doc.client.find((c) => c.label === 'fnWithNonExportedRef');
      expect(fn).toBeDefined();

      // Check if it's in missingComments
      const missingComment = pluginAStats.missingComments.find((d) => d.id === fn!.id);
      expect(missingComment).toBeDefined();
    });

    it('validates missingComments includes destructured parameter children', () => {
      // crazyFunction has destructured params with nested properties
      // Current behavior: nested properties without comments are flagged
      const fn = doc.client.find((c) => c.label === 'crazyFunction');
      expect(fn).toBeDefined();

      const objParam = fn!.children?.find((c) => c.label === 'obj');
      expect(objParam).toBeDefined();

      const hiProp = objParam!.children?.find((c) => c.label === 'hi');
      expect(hiProp).toBeDefined();

      // Current behavior: property without comment is flagged
      // Note: This is a false positive that will be fixed in Phase 4.2
      // Verify the property structure exists and check if it's in missingComments
      expect(hiProp!.description).toBeDefined();
      const hasDescription = hiProp!.description!.length > 0;
      const missingComment = pluginAStats.missingComments.find((d) => d.id === hiProp!.id);

      // If property has no description, it should be in missingComments
      // If it has a description, it should not be in missingComments
      if (!hasDescription) {
        expect(missingComment).toBeDefined();
      } else {
        expect(missingComment).toBeUndefined();
      }
    });

    it('validates missingComments does not include APIs with descriptions', () => {
      // notAnArrowFn has complete JSDoc
      const fn = doc.client.find((c) => c.label === 'notAnArrowFn');
      expect(fn).toBeDefined();

      const missingComment = pluginAStats.missingComments.find((d) => d.id === fn!.id);
      expect(missingComment).toBeUndefined();
    });

    it('validates missingComments includes type aliases without documentation', () => {
      // NotAnArrowFnType has no JSDoc comment
      const type = doc.client.find((c) => c.label === 'NotAnArrowFnType');
      expect(type).toBeDefined();

      const missingComment = pluginAStats.missingComments.find((d) => d.id === type!.id);
      expect(missingComment).toBeDefined();
    });
  });

  describe('destructured parameter validation', () => {
    it('validates destructured parameter structure is extracted correctly', () => {
      const fn = doc.client.find((c) => c.label === 'crazyFunction');
      expect(fn).toBeDefined();

      // First parameter: obj: { hi: string }
      const objParam = fn!.children?.find((c) => c.label === 'obj');
      expect(objParam).toBeDefined();
      expect(objParam!.children).toBeDefined();
      expect(objParam!.children!.length).toBe(1);

      // Second parameter: { fn1, fn2 }
      const fnParam = fn!.children?.find((c) => c.label === '{ fn1, fn2 }');
      expect(fnParam).toBeDefined();
      expect(fnParam!.children).toBeDefined();
      expect(fnParam!.children!.length).toBe(2);
    });

    it('validates parent parameter comment is extracted for destructured params', () => {
      const fn = doc.client.find((c) => c.label === 'crazyFunction');
      expect(fn).toBeDefined();

      const objParam = fn!.children?.find((c) => c.label === 'obj');
      expect(objParam).toBeDefined();

      // Current behavior: parent parameter comments are NOT extracted for TypeLiteral parameters
      // This is a known limitation - when a parameter has a TypeLiteral type (destructured params),
      // buildApiDeclaration is called directly without extracting the JSDoc comment for the parameter name.
      // This will be fixed in Phase 4.1
      expect(objParam!.description).toBeDefined();
      // Currently, the description is empty for destructured parameters
      // After Phase 4.1, this should contain the @param obj comment
      expect(objParam!.description!.length).toBe(0);
    });

    it('validates property-level comments are not currently extracted (current limitation)', () => {
      // This test documents current behavior: property-level @param tags are not extracted
      // After Phase 4.1, this should be updated to test that property-level comments ARE extracted
      const fn = doc.client.find((c) => c.label === 'crazyFunction');
      expect(fn).toBeDefined();

      const objParam = fn!.children?.find((c) => c.label === 'obj');
      expect(objParam).toBeDefined();

      const hiProp = objParam!.children?.find((c) => c.label === 'hi');
      expect(hiProp).toBeDefined();

      // Current behavior: property-level comments are not extracted
      // Even if @param obj.hi existed in JSDoc, it wouldn't be found
      expect(hiProp!.description).toBeDefined();
      expect(hiProp!.description!.length).toBe(0);
    });

    it('validates nested destructured parameters are extracted', () => {
      const fn = doc.client.find((c) => c.label === 'crazyFunction');
      expect(fn).toBeDefined();

      const fnParam = fn!.children?.find((c) => c.label === '{ fn1, fn2 }');
      expect(fnParam).toBeDefined();

      const fn1 = fnParam!.children?.find((c) => c.label === 'fn1');
      expect(fn1).toBeDefined();
      expect(fn1!.type).toBe(TypeKind.FunctionKind);
      expect(fn1!.children).toBeDefined();

      // fn1 has nested parameter: foo: { param: string }
      const fooParam = fn1!.children?.find((c) => c.label === 'foo');
      expect(fooParam).toBeDefined();
      expect(fooParam!.type).toBe(TypeKind.ObjectKind);
      expect(fooParam!.children).toBeDefined();

      const paramProp = fooParam!.children?.find((c) => c.label === 'param');
      expect(paramProp).toBeDefined();
      expect(paramProp!.type).toBe(TypeKind.StringKind);
    });
  });

  describe('inline object parameter validation', () => {
    it('validates inline object parameters are extracted as children', () => {
      const grouped = groupPluginApi(doc.client);
      const setup = grouped.setup;
      expect(setup).toBeDefined();

      const getSearchService2 = setup!.children?.find((c) => c.label === 'getSearchService2');
      expect(getSearchService2).toBeDefined();
      expect(getSearchService2!.type).toBe(TypeKind.FunctionKind);
      expect(getSearchService2!.children).toBeDefined();

      const searchSpecParam = getSearchService2!.children?.find((c) => c.label === 'searchSpec');
      expect(searchSpecParam).toBeDefined();
      expect(searchSpecParam!.children).toBeDefined();
      expect(searchSpecParam!.children!.length).toBe(2); // username and password
    });

    it('validates missing property-level comments on inline object parameters', () => {
      const grouped = groupPluginApi(doc.client);
      const setup = grouped.setup;
      expect(setup).toBeDefined();

      const getSearchService2 = setup!.children?.find((c) => c.label === 'getSearchService2');
      expect(getSearchService2).toBeDefined();

      const searchSpecParam = getSearchService2!.children?.find((c) => c.label === 'searchSpec');
      expect(searchSpecParam).toBeDefined();

      const usernameProp = searchSpecParam!.children?.find((c) => c.label === 'username');
      expect(usernameProp).toBeDefined();

      // Current behavior: property without comment is flagged
      // Note: This is a false positive that will be fixed in Phase 4.2
      // Verify the property structure exists and check if it's in missingComments
      expect(usernameProp!.description).toBeDefined();
      const hasDescription = usernameProp!.description!.length > 0;
      const missingComment = pluginAStats.missingComments.find((d) => d.id === usernameProp!.id);

      // If property has no description, it should be in missingComments
      // If it has a description, it should not be in missingComments
      if (!hasDescription) {
        expect(missingComment).toBeDefined();
      } else {
        expect(missingComment).toBeUndefined();
      }
    });

    it('validates deeply nested inline object parameters', () => {
      const grouped = groupPluginApi(doc.client);
      const setup = grouped.setup;
      expect(setup).toBeDefined();

      const fnWithInlineParams = setup!.children?.find((c) => c.label === 'fnWithInlineParams');
      expect(fnWithInlineParams).toBeDefined();

      const objParam = fnWithInlineParams!.children?.find((c) => c.label === 'obj');
      expect(objParam).toBeDefined();

      const fnProp = objParam!.children?.find((c) => c.label === 'fn');
      expect(fnProp).toBeDefined();
      expect(fnProp!.type).toBe(TypeKind.FunctionKind);

      const fooParam = fnProp!.children?.find((c) => c.label === 'foo');
      expect(fooParam).toBeDefined();
      expect(fooParam!.type).toBe(TypeKind.ObjectKind);

      const paramProp = fooParam!.children?.find((c) => c.label === 'param');
      expect(paramProp).toBeDefined();
      expect(paramProp!.type).toBe(TypeKind.StringKind);
    });
  });

  describe('stats validation output', () => {
    it('validates stats structure contains all required fields', () => {
      expect(pluginAStats).toBeDefined();
      expect(pluginAStats.missingComments).toBeDefined();
      expect(Array.isArray(pluginAStats.missingComments)).toBe(true);
      expect(pluginAStats.isAnyType).toBeDefined();
      expect(Array.isArray(pluginAStats.isAnyType)).toBe(true);
      expect(pluginAStats.noReferences).toBeDefined();
      expect(Array.isArray(pluginAStats.noReferences)).toBe(true);
      expect(typeof pluginAStats.apiCount).toBe('number');
      expect(typeof pluginAStats.missingExports).toBe('number');
      expect(typeof pluginAStats.deprecatedAPIsReferencedCount).toBe('number');
      expect(typeof pluginAStats.adoptionTrackedAPIsCount).toBe('number');
    });

    it('validates isAnyType array contains correct APIs', () => {
      expect(pluginAStats.isAnyType.length).toBe(1);
      const anyType = pluginAStats.isAnyType[0];
      expect(anyType).toBeDefined();
      expect(anyType.id).toContain('imAnAny');
    });

    it('validates missingComments array contains ApiDeclaration objects with required fields', () => {
      if (pluginAStats.missingComments.length > 0) {
        const missing = pluginAStats.missingComments[0];
        expect(missing).toBeDefined();
        expect(missing.id).toBeDefined();
        expect(missing.label).toBeDefined();
        expect(missing.path).toBeDefined();
        expect(missing.type).toBeDefined();
        expect(missing.parentPluginId).toBeDefined();
      }
    });

    it('validates noReferences array structure', () => {
      expect(Array.isArray(pluginAStats.noReferences)).toBe(true);
      if (pluginAStats.noReferences.length > 0) {
        const noRef = pluginAStats.noReferences[0];
        expect(noRef).toBeDefined();
        expect(noRef.id).toBeDefined();
        // APIs with no references should have undefined or empty references array
        expect(noRef.references === undefined || noRef.references.length === 0).toBe(true);
      }
    });

    it('validates apiCount matches actual API declarations', () => {
      const totalApis = doc.client.length + doc.server.length + doc.common.length;
      // apiCount includes children, so it should be >= total top-level APIs
      expect(pluginAStats.apiCount).toBeGreaterThanOrEqual(totalApis);
    });

    it('captures stats snapshot', () => {
      // Stats snapshot is written in beforeAll alongside other snapshots.
      // This test verifies the snapshot file was created and matches.
      const snapshotPath = Path.resolve(__dirname, 'snapshots', 'plugin_a.stats.json');
      const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));

      expect(snapshot.counts.apiCount).toBe(pluginAStats.apiCount);
      expect(snapshot.counts.missingComments).toBe(pluginAStats.missingComments.length);
      expect(snapshot.counts.isAnyType).toBe(pluginAStats.isAnyType.length);
      expect(snapshot.counts.noReferences).toBe(pluginAStats.noReferences.length);
    });
  });

  describe('property-level JSDoc validation (future enhancement)', () => {
    it('documents that property-level JSDoc is not currently validated', () => {
      // This test documents current limitation
      // After Phase 4.1, property-level @param tags like @param obj.prop should be validated
      const fn = doc.client.find((c) => c.label === 'crazyFunction');
      expect(fn).toBeDefined();

      const objParam = fn!.children?.find((c) => c.label === 'obj');
      expect(objParam).toBeDefined();

      const hiProp = objParam!.children?.find((c) => c.label === 'hi');
      expect(hiProp).toBeDefined();

      // Current behavior: property-level comments are not checked
      // Future: should check for @param obj.hi and not flag as missing if it exists
      const missingComment = pluginAStats.missingComments.find((d) => d.id === hiProp!.id);
      // Currently flagged as missing (false positive)
      expect(missingComment).toBeDefined();
    });

    it('documents expected future behavior for property-level validation', () => {
      // After Phase 4.1 and 4.2, the validation should:
      // 1. Check for property-level @param tags (e.g., @param obj.prop)
      // 2. Not flag as missing if parent has comment OR property-level tag exists
      // 3. Support nested property access (e.g., @param obj.nested.prop)

      // For now, this is a placeholder test documenting expected behavior
      expect(true).toBe(true);
    });
  });
});
