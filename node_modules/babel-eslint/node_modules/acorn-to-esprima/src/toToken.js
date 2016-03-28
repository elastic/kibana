module.exports = function (token, tt) {
  var type = token.type;
  token.range = [token.start, token.end];

  if (type === tt.name) {
    token.type = "Identifier";
  } else if (type === tt.semi || type === tt.comma ||
             type === tt.parenL || type === tt.parenR ||
             type === tt.braceL || type === tt.braceR ||
             type === tt.slash || type === tt.dot ||
             type === tt.bracketL || type === tt.bracketR ||
             type === tt.ellipsis || type === tt.arrow ||
             type === tt.star || type === tt.incDec ||
             type === tt.colon || type === tt.question ||
             type === tt.template || type === tt.backQuote ||
             type === tt.dollarBraceL || type === tt.at ||
             type === tt.logicalOR || type === tt.logicalAND ||
             type === tt.bitwiseOR || type === tt.bitwiseXOR ||
             type === tt.bitwiseAND || type === tt.equality ||
             type === tt.relational || type === tt.bitShift ||
             type === tt.plusMin || type === tt.modulo ||
             type === tt.exponent || type === tt.prefix ||
             type === tt.doubleColon ||
             type.isAssign) {
    token.type = "Punctuator";
    if (!token.value) token.value = type.label;
  } else if (type === tt.jsxTagStart) {
    token.type = "Punctuator";
    token.value = "<";
  } else if (type === tt.jsxTagEnd) {
    token.type = "Punctuator";
    token.value = ">";
  } else if (type === tt.jsxName) {
    token.type = "JSXIdentifier";
  } else if (type === tt.jsxText) {
    token.type = "JSXText";
  } else if (type.keyword === "null") {
    token.type = "Null";
  } else if (type.keyword === "false" || type.keyword === "true") {
    token.type = "Boolean";
  } else if (type.keyword) {
    token.type = "Keyword";
  } else if (type === tt.num) {
    token.type = "Numeric";
    token.value = String(token.value);
  } else if (type === tt.string) {
    token.type = "String";
    token.value = JSON.stringify(token.value);
  } else if (type === tt.regexp) {
    token.type = "RegularExpression";
    token.regex = {
      pattern: token.value.pattern,
      flags: token.value.flags
    };
    token.value = String(token.value.value);
  }

  return token;
};