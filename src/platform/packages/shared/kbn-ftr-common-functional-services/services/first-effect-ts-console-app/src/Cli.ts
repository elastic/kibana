import * as Command from "@effect/cli/Command"

const command = Command.make("hello")

export const run = Command.run(command, {
  name: "Hello World",
  version: "0.0.0"
})
