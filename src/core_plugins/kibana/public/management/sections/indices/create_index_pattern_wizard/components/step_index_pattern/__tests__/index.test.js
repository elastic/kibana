const render = jest.fn();

jest.doMock('react-dom', () => ({ render }));

const { renderStepIndexPattern } = require('../index');

describe('StepIndexPatternRender', () => {
  beforeEach(() => {
    render.mockClear();
  });

  it('should call render', () => {
    renderStepIndexPattern(
      [],
      '',
      false,
      {},
      {},
      () => {}
    );

    expect(render.mock.calls.length).toBe(1);
  });
});
