import React from 'react';
import type { RouteProps } from 'react-router-dom';
/**
 * This is a wrapper around the react-router-dom Route component that inserts
 * MatchPropagator in every application route. It helps track all route changes
 * and send them to the execution context, later used to enrich APM
 * 'route-change' transactions.
 */
export declare const Route: <T extends {}>({ children, component: Component, render, ...rest }: RouteProps<string, {
    [K: string]: string;
} & T>) => React.JSX.Element;
/**
 * The match propagator that is part of the Route
 */
export declare const MatchPropagator: () => null;
