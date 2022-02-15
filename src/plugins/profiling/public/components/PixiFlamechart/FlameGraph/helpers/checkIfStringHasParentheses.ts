const checkIfStringHasParentheses = (string: string) => {
  const parenthesesRegex = /\(|\)/

  return parenthesesRegex.test(string)
}

export default checkIfStringHasParentheses
