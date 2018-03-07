/**
 * When you make an async request, typically you want to show the user a spinner while they wait.
 * However, if the request takes less than 300 ms, the spinner will flicker in the UI and the user
 * won't have time to register it as a spinner. This function ensures the spinner (or whatever
 * you're showing the user) displays for at least 300 ms, even if the request completes before then.
 */
export async function ensureMinimumTime(promiseOrPromises, minimumTimeMs = 300) {
  let returnValue;

  // Block on the async action and start the clock.
  const asyncActionStartTime = new Date().getTime();
  if (Array.isArray(promiseOrPromises)) {
    returnValue = await Promise.all(promiseOrPromises);
  } else {
    returnValue = await promiseOrPromises;
  }

  // Measure how long the async action took to complete.
  const asyncActionCompletionTime = new Date().getTime();
  const asyncActionDuration = asyncActionCompletionTime - asyncActionStartTime;

  // Wait longer if the async action completed too quickly.
  if (asyncActionDuration < minimumTimeMs) {
    const additionalWaitingTime = minimumTimeMs - (asyncActionCompletionTime - asyncActionStartTime);
    await new Promise(resolve => setTimeout(resolve, additionalWaitingTime));
  }

  return returnValue;
}
