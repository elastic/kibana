// var traverse = require("babel-core").traverse;

module.exports = function (ast, traverse) {
  ast.sourceType = "module";
  ast.range = [ast.start, ast.end];
  traverse(ast, astTransformVisitor);
};

var astTransformVisitor = {
  noScope: true,
  enter: function (node) {
    node.range = [node.start, node.end];

    // private var to track original node type
    node._babelType = node.type;

    if (node.innerComments) {
      node.trailingComments = node.innerComments;
    }

    // make '_paths' non-enumerable (babel-eslint #200)
    Object.defineProperty(node, "_paths", { value: node._paths, writable: true })
  },
  exit: function (node) { /* parent */
    if (this.isSpreadProperty()) {
      node.type = "SpreadProperty";
      node.key = node.value = node.argument;
    }

    // flow: prevent "no-undef"
    // for "Component" in: "let x: React.Component"
    if (this.isQualifiedTypeIdentifier()) {
      delete node.id;
    }
    // for "b" in: "var a: { b: Foo }"
    if (this.isObjectTypeProperty()) {
      delete node.key;
    }
    // for "indexer" in: "var a: {[indexer: string]: number}"
    if (this.isObjectTypeIndexer()) {
      delete node.id;
    }
    // for "param" in: "var a: { func(param: Foo): Bar };"
    if (this.isFunctionTypeParam()) {
      delete node.name;
    }

    // modules

    if (this.isImportDeclaration()) {
      delete node.isType;
    }

    if (this.isExportDeclaration()) {
      var declar = this.get("declaration");
      if (declar.isClassExpression()) {
        node.declaration.type = "ClassDeclaration";
      } else if (declar.isFunctionExpression()) {
        node.declaration.type = "FunctionDeclaration";
      }
    }

    // remove class property keys (or patch in escope)
    if (this.isClassProperty()) {
      delete node.key;
    }

    // async function as generator
    if (this.isFunction()) {
      if (node.async) node.generator = true;
    }

    // await transform to yield
    if (this.isAwaitExpression()) {
      node.type = "YieldExpression";
      node.delegate = node.all;
      delete node.all;
    }

    // template string range fixes
    if (this.isTemplateLiteral()) {
      node.quasis.forEach(function (q) {
        q.range[0] -= 1;
        if (q.tail) {
          q.range[1] += 1;
        } else {
          q.range[1] += 2;
        }
        q.loc.start.column -= 1;
        if (q.tail) {
          q.loc.end.column += 1;
        } else {
          q.loc.end.column += 2;
        }
      });
    }
  }
};
