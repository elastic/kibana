import path from 'path';
import { GatedProcess } from './gated_process';
import { deserializeArgument } from '../valid_processes';
import { calculateMd5 } from './checksum';

if (process.argv.length < 2) {
  throw new Error('Valid processes should be provided as the third argument');
}
const validProcesses = deserializeArgument(process.argv[2]);

const processes = new Map();

process.on('disconnect', () => {
  for (const p of processes.values()) {
    p.kill();
  }
});

process.on('message', async ({ processId, message: { id, type, payload } }) => {
  try {
    switch(type) {
      case 'spawn': {
        const { command, args } = payload;

        const commandMd5 = await calculateMd5(command);
        const commandFilename = path.basename(command);

        if (!validProcesses.find(({ filename, md5 }) => filename === commandFilename && md5 === commandMd5)) {
          throw new Error(`Invalid process ${command} ${commandMd5}`);
        }

        const gatedProcess = new GatedProcess(processId, command, args);
        processes.set(processId, gatedProcess);
        break;
      }
      case 'kill': {
        const gatedProcess = processes.get(processId);
        gatedProcess.kill();
        break;
      }
      default:
        throw new Error(`Unknown message type ${type}`);
    }

    process.send({ processId, message: { id, type: 'ack', payload: { success: true } } });
  } catch (err) {
    process.send({ processId, message: { id, type: 'ack', payload: { success: false, error: err.toString() } } });
  }
});