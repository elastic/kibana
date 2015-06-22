/*
 * Identify AST blocks that refer to an AngularJS module
 */
module.exports = {
  "type": "CallExpression",
  "callee": {
    "type": "MemberExpression",
    "object": {
      "type": "Identifier",
      "name": "angular"
    },
    "property": {
      "type": "Identifier",
      "name": "module"
    }
  }
};
