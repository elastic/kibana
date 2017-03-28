export default ({ getService }) => {
  const esArchiver = getService('esArchiver');
  const es = getService('es');
  const log = getService('log');

  describe('tests', () => {
    before(async () => {
      log.debug('before load()');
      await esArchiver.load('test_archive');
      log.debug('after load()');
    });

    it('loaded the archive', async () => {
      log.debug('es aliases', await es.indices.getAlias());
    });

    after(async () => {
      log.debug('before unload()');
      await esArchiver.unload('test_archive');
      log.debug('after unload()');
    });
  });
};
