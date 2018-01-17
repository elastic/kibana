const render = jest.fn();
const unmountComponentAtNode = jest.fn();

jest.doMock('react-dom', () => ({ render, unmountComponentAtNode }));

const { renderStepIndexPattern } = require('../index');

describe('StepIndexPatternRender', () => {
  beforeEach(() => {
    render.mockClear();
    unmountComponentAtNode.mockClear();
  });

  it('should call render', () => {
    renderStepIndexPattern(
      [],
      '',
      false,
      {},
      () => {}
    );

    expect(render.mock.calls.length).toBe(1);
  });
});
