export const delay = (ms = 10_000) => {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

function add(a, b) {
  console.log('adding %d + %d', a, b)
  return a + b
}
