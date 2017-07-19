export default function () {
  describe('failing test', () => {
    it('$FAILING_TEST$', () => {
      throw new Error('$FAILING_TEST_ERROR$');
    });
  });
}
