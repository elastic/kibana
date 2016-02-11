import Config from '../config/config';

export default class StubKbnServer {
  constructor() {
    this.config = Config.withDefaultSchema();
  }
}
