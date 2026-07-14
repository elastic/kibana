import * as functionType from './function';
import * as literal from './literal';
import * as wildcard from './wildcard';
export { nodeBuilder } from './node_builder';
export { type KqlFunctionNode, KQL_NODE_TYPE_FUNCTION } from './function';
export { type KqlLiteralNode, KQL_NODE_TYPE_LITERAL } from './literal';
export { type KqlWildcardNode, KQL_NODE_TYPE_WILDCARD } from './wildcard';
/**
 * @public
 */
export declare const nodeTypes: {
    function: typeof functionType;
    literal: typeof literal;
    wildcard: typeof wildcard;
};
