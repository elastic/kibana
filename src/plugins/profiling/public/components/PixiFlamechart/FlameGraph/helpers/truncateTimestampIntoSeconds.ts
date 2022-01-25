const truncateTimestampIntoSeconds = (date: Date | number) => {
  return Math.trunc(new Date(date).getTime() / 1000)
}

export default truncateTimestampIntoSeconds
