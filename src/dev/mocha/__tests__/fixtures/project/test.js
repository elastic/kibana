describe('SUITE', () => {
  it('works', () => {});
  it('fails', () => {
    throw new Error('FORCE_TEST_FAIL');
  });

  describe('SUB_SUITE', () => {
    beforeEach('success hook', () => {});
    beforeEach('fail hook', () => {
      throw new Error('FORCE_HOOK_FAIL');
    });

    it('never runs', () => {});
  });
});
