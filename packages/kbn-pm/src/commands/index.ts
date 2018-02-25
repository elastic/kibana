import { Command } from './command';
import { BootstrapCommand } from './bootstrap';
import { CleanCommand } from './clean';
import { RunCommand } from './run';

export const commands: { [key: string]: Command<any> } = {
  bootstrap: BootstrapCommand,
  clean: CleanCommand,
  run: RunCommand,
};
