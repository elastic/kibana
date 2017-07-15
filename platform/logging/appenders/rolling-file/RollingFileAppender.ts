import { FileAppender } from '../file/FileAppender';
import { RollingFileAppenderConfig } from './RollingFileAppenderConfig';

export class RollingFileAppender extends FileAppender {
  constructor(protected readonly config: RollingFileAppenderConfig) {
    super(config)
  }
}
