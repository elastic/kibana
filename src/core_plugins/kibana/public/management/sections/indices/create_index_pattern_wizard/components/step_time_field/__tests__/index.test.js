const render = jest.fn();
const unmountComponentAtNode = jest.fn();

jest.doMock('react-dom', () => ({ render, unmountComponentAtNode }));

const { renderStepTimeField, destroyStepTimeField } = require('../index');

describe('StepTimeFieldRender', () => {
  beforeEach(() => {
    jest.spyOn(document, 'getElementById').mockImplementation(() => ({}));
    render.mockClear();
    unmountComponentAtNode.mockClear();
  });

  it('should call render', () => {
    renderStepTimeField(
      '',
      {},
      () => {},
      () => {},
    );

    expect(render.mock.calls.length).toBe(1);
  });

  it('should call unmountComponentAtNode', () => {
    destroyStepTimeField();
    expect(unmountComponentAtNode.mock.calls.length).toBe(1);
  });
});
