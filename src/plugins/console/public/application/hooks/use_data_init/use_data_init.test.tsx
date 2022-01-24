// import React from 'react';
// import { Enz } from 'enzyme'
import { useDataInit } from './index'

const mountReactHook = (hook: () => any) => {
  // const Component = ({ children }: any) => children(hook());
  const componentHook = {};
  let componentMount;

  // act(() => {
  //   componentMount = Enzyme.shallow(
  //     <Component>
  //       {(hookValues: any) => {
  //         Object.assign(componentHook, hookValues);
  //         return null;
  //       }}
  //     </Component>
  //   );
  // });
  return { componentMount, componentHook };
};

describe('useDataInit Hook', () => {
  let setupComponent;
  let hook: { loading?: any; getData?: any; error?: any; done?: any; };

  beforeEach(() => {
    setupComponent = mountReactHook(useDataInit); // Mount a Component with our hook
    hook = setupComponent.componentHook;
  });

  it('sets loading to true before getting a data', async () => {
    expect(hook.loading).toEqual(false);

    await act(async () => { // perform changes within our component
      hook.getData();
    });

    expect(hook.loading).toEqual(true); // assert the values change correctly

    await act(async () => {
      await wait(); // wait for the promise to resolve and next mount
    });

    expect(hook.loading).toEqual(false); // reassert against our values
  });

  it('sets a new error', async () => {
    expect(hook.error).toEqual(undefined);

    await act(async () => {
      hook.getData();
      await wait();
    });

    expect(hook.done).not.toEqual(undefined);
  });
});

function act(arg0: () => void) {
  throw new Error('Function not implemented.');
}

function wait() {
  throw new Error('Function not implemented.');
}
