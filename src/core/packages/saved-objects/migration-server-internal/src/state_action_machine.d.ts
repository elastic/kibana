export interface ControlState {
    controlState: string;
}
/**
 * A state-action machine next function that returns the next action thunk
 * based on the passed in state.
 */
export type Next<S> = (state: S) => (() => Promise<unknown>) | null;
/**
 * A state-action machine model that given the current state and an action
 * response returns the state for the next step.
 */
export type Model<S> = (state: S, res: any) => S;
/**
 * A state-action machine for performing Saved Object Migrations.
 *
 * Based on https://www.microsoft.com/en-us/research/uploads/prod/2016/12/Computation-and-State-Machines.pdf
 *
 * The state-action machine defines it's behaviour in steps. Each step is a
 * transition from a state s_i to the state s_i+1 caused by an action a_i.
 *
 * s_i   -> a_i -> s_i+1
 * s_i+1 -> a_i+1 -> s_i+2
 *
 * Given a state s1, `next(s1)` returns the next action to execute. Actions are
 * asynchronous, once the action resolves, we can use the action response to
 * determine the next state to transition to as defined by the function
 * `model(state, response)`.
 *
 * We can then loosely define a step as:
 * s_i+1 = model(s_i, await next(s_i)())
 *
 * When there are no more actions returned by `next` the state-action machine
 * terminates.
 *
 * @param initialState The initial state with which to start the state action
 * machine
 * @param next A function which given the current state, returns a thunk which
 * is the next action to perform. If next returns null the state action machine
 * terminates.
 * @param model A function which given the current state and the response of
 * the action thunk, returns a new state
 * @param onStepComplete A callback functions which is called after every
 * completed step
 */
export declare function stateActionMachine<S extends ControlState>(initialState: S, next: Next<S>, model: Model<S>): Promise<S>;
