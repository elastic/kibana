import { Command } from './command';
import { BootstrapCommand } from './bootstrap';
import { CleanCommand } from './clean';
import { RunCommand } from './run';

export const commands = {
  bootstrap: BootstrapCommand,
  clean: CleanCommand,
  run: RunCommand,
};

type Commands = typeof commands;

export function getCommand(name: keyof Commands) {
  return commands[name];
}
