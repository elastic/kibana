# Pulse client

This is the pulse client in Kibana core that integrates with the remote Pulse
service.

## How it works

Every 5 seconds, we send a request to the remote Pulse service for any
instructions that are appropriate for this deployment.

```js
let instructions = [];

setInterval(() => {
  instructions = getNewInstructions();
}, 5000);

class Pulse {
  getMyInstructions(me) {
    return instructions.filter(instruction => instruction.owner === me);
  }
}
```
