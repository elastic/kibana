import ts from 'typescript';
type TypeScript = typeof ts;

const MESSAGE_DESC_KEYS: Array<keyof MessageDescriptor> = [
  'id',
  'defaultMessage',
  'description',
]

export interface MessageDescriptor {
  id: string
  description?: string | object
  defaultMessage?: string
  file?: string
  start?: number
  end?: number
}

/**
 * Check if node is `foo.bar.formatMessage` node
 * @param node
 * @param sf
 */
function isMemberMethodFormatMessageCall(
  ts: TypeScript,
  node: ts.CallExpression,
) {
  const fnNames = new Set([ 'translate' ]);
  const method = node.expression

  // Handle foo.formatMessage()
  if (ts.isPropertyAccessExpression(method)) {
    console.log('method.name.text::', method.name.text);
    return fnNames.has(method.name.text)
  }

  // Handle formatMessage()
  return ts.isIdentifier(method) && fnNames.has(method.text)
}


function setAttributesInObject(
  ts: TypeScript,
  factory: ts.NodeFactory,
  node: ts.ObjectLiteralExpression,
  msg: MessageDescriptor,
  ast?: boolean
) {
  const newProps = [
    factory.createPropertyAssignment('id', factory.createStringLiteral(msg.id)),
  ]

  for (const prop of node.properties) {
    if (
      ts.isPropertyAssignment(prop) &&
      ts.isIdentifier(prop.name) &&
      MESSAGE_DESC_KEYS.includes(prop.name.text as keyof MessageDescriptor)
    ) {
      newProps.push(prop)
      continue
    }
    if (ts.isPropertyAssignment(prop)) {
      newProps.push(prop)
    }
  }
  return factory.createObjectLiteralExpression(
    factory.createNodeArray(newProps)
  )
}



export function extractMessagesFromCallExpression(
  ts: TypeScript,
  factory: ts.NodeFactory,
  node: ts.CallExpression,
  opts: any,
  sf: ts.SourceFile
): ts.VisitResult<ts.CallExpression> {
  
  console.log('isMemberMethodFormatMessageCall(ts, node)::', isMemberMethodFormatMessageCall(ts, node));

  if (isMemberMethodFormatMessageCall(ts, node)) {
    const [idArgumentNode, descriptorsObj, ...restArgs] = node.arguments

    if (
      ts.isStringLiteral(idArgumentNode) &&
      ts.isObjectLiteralExpression(descriptorsObj)
    ) {
      const msg = extractMessageDescriptor(ts, descriptorsObj, opts, sf)
      if (!msg) {
        return node
      }

      const messageId: string = literalToObj(ts, idArgumentNode) as string;

      return factory.updateCallExpression(
        node,
        node.expression,
        node.typeArguments,
        [
          setAttributesInObject(
            ts,
            factory,
            descriptorsObj,
            {
              id: messageId,
            },
            opts.ast
          ),
          setAttributesInObject(
            ts,
            factory,
            descriptorsObj,
            {
              id: messageId,
            },
            opts.ast
          ),
          ...restArgs,
        ]
      )
    }
  }
  return node
}




function extractMessageDescriptor(
  ts: TypeScript,
  node:
    | ts.ObjectLiteralExpression
    | ts.JsxOpeningElement
    | ts.JsxSelfClosingElement,
  {overrideIdFn, extractSourceLocation, preserveWhitespace}: any,
  sf: ts.SourceFile
): MessageDescriptor | undefined {
  let properties:
    | ts.NodeArray<ts.ObjectLiteralElement>
    | ts.NodeArray<ts.JsxAttributeLike>
    | undefined = undefined
  if (ts.isObjectLiteralExpression(node)) {
    properties = node.properties
  } else if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
    properties = node.attributes.properties
  }
  const msg: MessageDescriptor = {id: ''}
  if (!properties) {
    return
  }

  properties.forEach(prop => {
    const {name} = prop
    const initializer:
      | ts.Expression
      | ts.JsxExpression
      | undefined =
      ts.isPropertyAssignment(prop) || ts.isJsxAttribute(prop)
        ? prop.initializer
        : undefined

    if (name && ts.isIdentifier(name) && initializer) {
      // {id: 'id'}
      if (ts.isStringLiteral(initializer)) {
        switch (name.text) {
          case 'id':
            msg.id = initializer.text
            break
          case 'defaultMessage':
            msg.defaultMessage = initializer.text
            break
          case 'description':
            msg.description = initializer.text
            break
        }
      }
      // {id: `id`}
      else if (ts.isNoSubstitutionTemplateLiteral(initializer)) {
        switch (name.text) {
          case 'id':
            msg.id = initializer.text
            break
          case 'defaultMessage':
            msg.defaultMessage = initializer.text
            break
          case 'description':
            msg.description = initializer.text
            break
        }
      }
      // {defaultMessage: 'asd' + bar'}
      else if (ts.isBinaryExpression(initializer)) {
        const [result, isStatic] = evaluateStringConcat(ts, initializer)
        if (isStatic) {
          switch (name.text) {
            case 'id':
              msg.id = result
              break
            case 'defaultMessage':
              msg.defaultMessage = result
              break
            case 'description':
              msg.description = result
              break
          }
        }
      }
      // description: {custom: 1}
      else if (
        ts.isObjectLiteralExpression(initializer) &&
        name.text === 'description'
      ) {
        msg.description = objectLiteralExpressionToObj(ts, initializer)
      }
    }
  })
  // We extracted nothing
  if (!msg.defaultMessage && !msg.id) {
    return
  }

  if (extractSourceLocation) {
    return {
      ...msg,
      file: sf.fileName,
      start: node.pos,
      end: node.end,
    }
  }
  return msg
}



function objectLiteralExpressionToObj(
  ts: TypeScript,
  obj: ts.ObjectLiteralExpression
): object {
  return obj.properties.reduce((all: Record<string, any>, prop) => {
    if (ts.isPropertyAssignment(prop) && prop.name) {
      if (ts.isIdentifier(prop.name)) {
        all[prop.name.escapedText.toString()] = literalToObj(
          ts,
          prop.initializer
        )
      } else if (ts.isStringLiteral(prop.name)) {
        all[prop.name.text] = literalToObj(ts, prop.initializer)
      }
    }
    return all
  }, {})
}

function literalToObj(ts: TypeScript, n: ts.Node) {
  if (ts.isNumericLiteral(n)) {
    return +n.text
  }
  if (ts.isStringLiteral(n)) {
    return n.text
  }
  if (n.kind === ts.SyntaxKind.TrueKeyword) {
    return true
  }
  if (n.kind === ts.SyntaxKind.FalseKeyword) {
    return false
  }
}

function evaluateStringConcat(
  ts: TypeScript,
  node: ts.BinaryExpression
): [result: string, isStaticallyEvaluatable: boolean] {
  const {right, left} = node
  if (!ts.isStringLiteral(right)) {
    return ['', false]
  }
  if (ts.isStringLiteral(left)) {
    return [left.text + right.text, true]
  }
  if (ts.isBinaryExpression(left)) {
    const [result, isStatic] = evaluateStringConcat(ts, left)
    return [result + right.text, isStatic]
  }
  return ['', false]
}