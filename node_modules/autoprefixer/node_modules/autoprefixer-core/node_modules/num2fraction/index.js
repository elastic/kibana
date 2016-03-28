//最大公约数 Greatest Common Divisor
function GCD(a, b) {
  if (b === 0) return a
  return GCD(b, a % b)
}

function findPrecision(n) {
  var e = 1

  while (Math.round(n * e) / e !== n) {
    e *= 10
  }

  return e
}

function num2fraction(num) {
  if (num === 0) return 0

  if (typeof num === 'string') {
    num = parseFloat(num)
  }


  var precision = findPrecision(num) //精确度
  var number = num * precision
  var gcd = GCD(number, precision)

  //分子
  var numerator = number / gcd
  //分母
  var denominator = precision / gcd

  //分数
  return numerator + '/' + denominator
}

module.exports = num2fraction

