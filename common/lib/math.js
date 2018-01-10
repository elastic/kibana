import mathjs from 'mathjs';

const isAlphaOriginal = mathjs.expression.parse.isAlpha;
mathjs.expression.parse.isAlpha = function(c, cPrev, cNext) {
  return isAlphaOriginal(c, cPrev, cNext) || c === '@' || c === '.';
};

export const math = mathjs;
