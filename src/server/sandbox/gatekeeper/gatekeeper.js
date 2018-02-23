import { GatedProcess } from './gated_process';

const validProcesses = process.argv.length > 1 ? process.argv[2].split(',') : [];

const processes = new Map();

process.on('disconnect', () => {
  for (const p of processes.values()) {
    p.kill();
  }
});

process.on('message', ({ id, message: { type, payload } }) => {
  switch(type) {
    case 'spawn': {
      const { command, args } = payload;
      if (validProcesses.indexOf(command) < 0) {
        throw new Error(`Invalid process ${command}`);
      }

      const gatedProcess = new GatedProcess(id, command, args);
      processes.set(id, gatedProcess);
      break;
    }
    case 'kill': {
      const gatedProcess = processes.get(id);
      gatedProcess.kill();
      break;
    }
    default:
      throw new Error(`Unknown message type ${type}`);
  }
});