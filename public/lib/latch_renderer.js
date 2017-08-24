/*
  TODO: Remove this whole thing

  Let me start by saying that this module is a hideous fact, so you know that we are both in total
  agreeance on that point.

  So why does it exist? Well, when if tomes time to render a function's arguments, we want to allow
  either of the templates a way to "fail" and fall back to some simple input.

  The problem is that by the time we hit such a failure, we're already in React's render lifecycle,
  so , we can't use state to trigger a fallback.

  And React swallows errors, opting instead to delegate to the window.onerror event, so try/catch is
  out of the question.

  And because React's render cycle is actually async, we can't just listen for the error on that
  single render.

  React 16 beta 1 adds a "componentDidCatch" lifecycle that we could use [1], but it's still a beta
  release, and we rather not buy into a beta upgrade right now.

  So, here we are, with this ugly, stateful monster of a module to check for a failure state on any
  of two (currently) templates and inform later templates if any of the earlier ones failed. Yay!

  Oh, and the latch name comes from the electronics world [2].

  [1] https://github.com/facebook/react/issues/2461#issuecomment-318203939

  [2] https://en.wikipedia.org/wiki/Flip-flop_(electronics)
*/

import { createEagerElement } from 'recompose';

export const createLatchRenderer = (latchFunction = 'latchRender') => {
  let latchActive = false; // track the latch state

  function renderRight(RightComponent, props) {
    latchActive = true;
    return createEagerElement(RightComponent, props);
  }

  return function renderLatch(LeftComponent, RightComponent, props) {
    if (latchActive) return renderRight(RightComponent, props);
    return createEagerElement(LeftComponent, { ...props, [latchFunction]: () => renderRight(RightComponent, props) });
  };
};
