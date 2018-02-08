const render = jest.fn();
const unmountComponentAtNode = jest.fn();

jest.doMock('react-dom', () => ({ render, unmountComponentAtNode }));

const { renderStepIndexPattern, destroyStepIndexPattern } = require('../index');

describe('StepIndexPatternRender', () => {
  beforeEach(() => {
    jest.spyOn(document, 'getElementById').mockImplementation(() => ({}));
    render.mockClear();
    unmountComponentAtNode.mockClear();
  });

  it('should call render', () => {
    renderStepIndexPattern(
      'reactDiv',
      [],
      '',
      false,
      {},
      () => {}
    );

    expect(render.mock.calls.length).toBe(1);
  });

  it('should call unmountComponentAtNode', () => {
    destroyStepIndexPattern('reactDiv');
    expect(unmountComponentAtNode.mock.calls.length).toBe(1);
  });
});
