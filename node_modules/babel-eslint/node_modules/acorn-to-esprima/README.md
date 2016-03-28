# acorn-to-esprima

Some functions to help transform an acorn/babel ast to esprima format.

Primarily for use in [babel-eslint](https://github.com/babel/babel-eslint), [babel-jscs](https://github.com/jscs-dev/babel-jscs), and [ast explorer](https://github.com/fkling/esprima_ast_explorer)

**There are no dependencies** (the methods were changed to pass in dependencies instead)

The current functions exposed are:

- `function attachComments(ast, comments, tokens)`
  - This modifies the comments passed in.
- `function toTokens(tokens, tt)`
  - `tt` is `require("babel-core").acorn.tokTypes`
  - Converts template string tokens (`convertTemplateType`)
  - filters out comment tokens
  - runs `toToken` over each token
- `function toToken(token, tt)`
  - Sets `token.type`, `token.range`, and `token.value`
- `function toAST(ast, traverse)`
  - `traverse` is `require("babel-core").traverse;`
  - traverses over the ast and makes any necessary changes (usually es6+)
- `function convertComments(comments)`
  - Modifies `comment.type`

How to use:

Check out the parse method of https://github.com/babel/babel-eslint/blob/master/index.js
```js
// example
exports.parse = function (code) {
  var comments = opts.onComment = [];
  var tokens = opts.onToken = [];

  var ast;
  try {
    ast = parse(code, {
        locations: true,
        ranges: true
    });
  } catch (err) { throw err; }

  tokens.pop();
  ast.tokens = acornToEsprima.toTokens(tokens, tt);

  acornToEsprima.convertComments(comments);
  ast.comments = comments;
  acornToEsprima.attachComments(ast, comments, ast.tokens);

  acornToEsprima.toAST(ast, traverse);

  return ast;
}
```