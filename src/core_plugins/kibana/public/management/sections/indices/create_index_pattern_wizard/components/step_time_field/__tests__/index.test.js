const render = jest.fn();

jest.doMock('react-dom', () => ({ render }));

const { renderStepTimeField } = require('../index');

describe('StepTimeFieldRender', () => {
  beforeEach(() => {
    render.mockClear();
  });

  it('should call render', () => {
    renderStepTimeField(
      '',
      {},
      () => {},
      () => {}
    );

    expect(render.mock.calls.length).toBe(1);
  });
});
