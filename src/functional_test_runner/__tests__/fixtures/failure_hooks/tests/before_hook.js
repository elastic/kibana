export default function () {
  describe('failing before hook', () => {
    before('$FAILING_BEFORE_HOOK$', () => {
      throw new Error('$FAILING_BEFORE_ERROR$');
    });

    it('stub test', () => {});
  });
}
