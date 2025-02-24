import { Console, Effect } from 'effect';

// Function to make the API call
const getJson = (url: string) =>
  Effect.tryPromise(() =>
    fetch(url).then((res) => {
      if (!res.ok) {
        console.log('error');
        throw new Error(res.statusText);
      }
      console.log('ok');
      return res.json() as unknown;
    })
  );

// Program that retries the API call twice, times out after 4 seconds,
// and logs errors
const program = (url: string) =>
  getJson(url).pipe(
    Effect.retry({ times: 2 }),
    Effect.timeout('4 seconds'),
    Effect.catchAll(Console.error)
  );

export const runEffectTSExperiments = () => {
  // Test case: successful API response
  Effect.runFork(program('https://dummyjson.com/products/1?delay=1000'));
  /*
Output:
ok
*/

  // Test case: API call exceeding timeout limit
  Effect.runFork(program('https://dummyjson.com/products/1?delay=5000'));
  /*
Output:
TimeoutException: Operation timed out before the specified duration of '4s' elapsed
*/

  // Test case: API returning an error response
  // Effect.runFork(program('https://dummyjson.com/auth/products/1?delay=500'));
  /*
Output:
error
error
error
UnknownException: An unknown error occurred
*/
}

