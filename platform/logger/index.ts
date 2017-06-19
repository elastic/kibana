export { LoggerService } from './LoggerService';
export { LoggerFactory, MutableLoggerFactory } from './LoggerFactory';
export { Logger } from './LoggerAdapter';
export { LoggerConfig } from './LoggerConfig';

// TODO Move to README
// # Logging
//
// This is a wrapper around external or internal log event systems, built as
// a mutable singleton. That way the logger can be required from any file,
// instead of having to inject it as a dependency into all services.
//
// The `LoggerService` is used to manage the log setup, while the
// `LoggerFactory` interface helps limit the external api to _only_ what's
// needed when used.
