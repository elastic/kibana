export default function () {
  describe('failing after hook', () => {
    it('stub test', () => {});
    after('$FAILING_AFTER_HOOK$', () => {
      throw new Error('$FAILING_AFTER_ERROR$');
    });
  });
}
