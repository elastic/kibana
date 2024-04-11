// import { extract } from '@formatjs/cli-lib';


import {
  Opts,
  transformWithTs,
} from '@formatjs/ts-transformer';

import { readFile } from 'fs-extra'


import ts from 'typescript'
type TypeScript = typeof ts;

// npx formatjs extract 'src/plugins/home/server/tutorials/instructions/functionbeat_instructions.ts' --throws --additional-function-names='translate' --out-file='en.json'

const files = [
  'src/plugins/home/server/tutorials/instructions/functionbeat_instructions.ts',
  // 'packages/core/apps/core-apps-browser-internal/src/status/components/version_header.tsx',
];


import { extractMessagesFromCallExpression } from './extractors/call_expt';

function getVisitor(
  ts: TypeScript,
  ctx: ts.TransformationContext,
  sf: ts.SourceFile,
  opts: Opts
) {
  const visitor: ts.Visitor = (
    node: ts.Node
  ): ts.Node => {
    const newNode = ts.isCallExpression(node)
      ? extractMessagesFromCallExpression(ts, ctx.factory, node, opts, sf) : node;

    return ts.visitEachChild(newNode as ts.Node, visitor, ctx)
  }
  return visitor
}

export function pretransformWithTs(ts: TypeScript, opts: Opts) {

  const transformFn: ts.TransformerFactory<ts.SourceFile> = ctx => {
    return sf => {
      return ts.visitEachChild(sf, getVisitor(ts, ctx, sf, opts), ctx)
    }
  }

  return transformFn
}

export async function extractI18nMessageDescriptors() {
  const fn = files[0];
  const source = await readFile(fn, 'utf8');
  let output;
  let messages: any[] = []

  try {
    output = ts.transpileModule(source, {
      compilerOptions: {
        allowJs: true,
        target: ts.ScriptTarget.ESNext,
        noEmit: true,
        experimentalDecorators: true,
      },
      reportDiagnostics: true,
      fileName: fn,
      transformers: {
        before: [
          // pretransformWithTs(ts, {}),
          transformWithTs(ts, {
            additionalFunctionNames: ['translate'],
            extractSourceLocation: true,
            ast: true,
            onMsgExtracted(filePath, msgs) {
              messages = messages.concat(msgs);
            },
          })],
      },
    })

    console.log('Done::');
    console.log(output);
    console.log(messages);
  } catch (err) {
    console.log('err::', err)
  }
}


