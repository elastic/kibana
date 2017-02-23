describe('esArchiver: createLog(logLevel, outpu)', () => {
  it('binds the log methods to the `output` stream');
  context('logLevel=0', () => {
    describe('#debug(...any)', () => {
      it('logs nothing');
    });
    describe('#info(...any)', () => {
      it('logs nothing');
    });
    describe('#error(err)', () => {
      it('logs nothing');
    });
  });
  context('logLevel=1', () => {
    describe('#debug(...any)', () => {
      it('logs nothing');
    });
    describe('#info(...any)', () => {
      it('logs nothing');
    });
    describe('#error(err)', () => {
      it('logs to the output stream');
    });
  });
  context('logLevel=2', () => {
    describe('#debug(...any)', () => {
      it('logs nothing');
    });
    describe('#info(...any)', () => {
      it('logs to the output stream');
    });
    describe('#error(err)', () => {
      it('logs to the output stream');
    });
  });
});
