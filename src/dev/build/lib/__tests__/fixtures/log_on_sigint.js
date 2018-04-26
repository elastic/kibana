console.log('listening for SIGINT');
setTimeout(() => {
  console.log('SIGINT not received');
}, 10000);
