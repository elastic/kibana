export const formatDisplayNumber = (number: number, integer?: boolean) => {
  if (isNaN(number)) {
    return '-'
  }

  if (number === 0) {
    return '0'
  }

  if (number < 0.01 && number > 0) {
    return number.toExponential(2)
  }

  return number.toFixed(integer ? 0 : 2)
}
