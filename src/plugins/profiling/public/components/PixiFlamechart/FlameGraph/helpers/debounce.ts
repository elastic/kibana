const debounce = (callback: Function, wait: number) => {
  let timeout: NodeJS.Timeout

  return (...args: any) => {
    const context = this
    clearTimeout(timeout)
    timeout = setTimeout(() => callback.apply(context, args), wait)
  };
}

export default debounce
