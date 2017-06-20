import { EventLogger } from './Log';
import { ConsoleLogger } from './ConsoleLogger';
import { WinstonLogger } from './WinstonLogger';
import { LoggerConfig } from '../LoggerConfig';

export { EventLogger };

// The default logger must be config free, as we don't have access to the
// config yet
export const defaultLogger: EventLogger = new ConsoleLogger();

export const createLoggerFromConfig = (config: LoggerConfig): EventLogger =>
  new WinstonLogger(config);
