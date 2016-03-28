/// <reference path="../dojo2/dojo.d.ts" />
/// <reference path="../node/node.d.ts" />

declare module digdug {
	export interface Handle {
		remove(): void;
	}

	/**
	 * Data that can be passed to tunnel providers to update the state of a job being executed on their service.
	 */
	export interface JobState {
		/**
		 * The build number of the software being tested by the job. Supported by Sauce Labs.
		 */
		buildId?: number;

		/**
		 * Additional arbitrary data to be stored alongside the job. Supported by TestingBot and Sauce Labs.
		 */
		extra?: {};

		/**
		 * A descriptive name for the job. Supported by TestingBot and Sauce Labs.
		 */
		name?: string;

		/**
		 * A status message to provide alongside a test. Supported by TestingBot.
		 */
		status?: string;

		/**
		 * Whether or not the job should be listed as successful. Supported by BrowserStack, TestingBot, and Sauce Labs.
		 */
		success: boolean;

		/**
		 * An array of tags for the job. Supported by TestingBot and Sauce Labs.
		 */
		tags?: string[];

		/**
		 * The public visibility of test results. May be one of 'public', 'public restricted', 'share', 'team', or 'private'.
		 * Supported by Sauce Labs.
		 */
		visibility?: string;
	}

	export interface Listener<EventType> {
		(event: EventType): void;
	}
}

declare module 'digdug/BrowserStackTunnel' {
	import Tunnel = require('digdug/Tunnel');

	class BrowserStackTunnel extends Tunnel {
		/**
		 * The BrowserStack access key. This will be initialized with the value of the `BROWSERSTACK_ACCESS_KEY`
		 * environment variable.
		 *
		 * @default the value of the BROWSERSTACK_ACCESS_KEY environment variable
		 */
		accessKey: string;

		/**
		 * Whether or not to start the tunnel with only WebDriver support. Setting this value to `false` is not
		 * supported.
		 *
		 * @default true
		 */
		automateOnly: boolean;

		/**
		 * If true, any other tunnels running on the account will be killed when the tunnel is started.
		 *
		 * @default false
		 */
		killOtherTunnels: boolean;

		/**
		 * A list of server URLs that should be proxied by the tunnel. Only the hostname, port, and protocol are used.
		 */
		servers: string[];

		/**
		 * Skip verification that the proxied servers are online and responding at the time the tunnel starts.
		 *
		 * @default true
		 */
		skipServerValidation: boolean;

		/**
		 * The BrowserStack username. This will be initialized with the value of the `BROWSERSTACK_USERNAME`
		 * environment variable.
		 *
		 * @default the value of the BROWSERSTACK_USERNAME environment variable
		 */
		username: string;

		constructor(kwArgs?: BrowserStackTunnel.KwArgs);
	}

	module BrowserStackTunnel {
		export interface KwArgs extends Tunnel.KwArgs {
			/**
			 * The BrowserStack access key. This will be initialized with the value of the `BROWSERSTACK_ACCESS_KEY`
			 * environment variable.
			 *
			 * @default the value of the BROWSERSTACK_ACCESS_KEY environment variable
			 */
			accessKey?: string;

			/**
			 * Whether or not to start the tunnel with only WebDriver support. Setting this value to `false` is not
			 * supported.
			 *
			 * @default true
			 */
			automateOnly?: boolean;

			/**
			 * If true, any other tunnels running on the account will be killed when the tunnel is started.
			 *
			 * @default false
			 */
			killOtherTunnels?: boolean;

			/**
			 * A list of server URLs that should be proxied by the tunnel. Only the hostname, port, and protocol are used.
			 */
			servers?: string[];

			/**
			 * Skip verification that the proxied servers are online and responding at the time the tunnel starts.
			 *
			 * @default true
			 */
			skipServerValidation?: boolean;

			/**
			 * The BrowserStack username. This will be initialized with the value of the `BROWSERSTACK_USERNAME`
			 * environment variable.
			 *
			 * @default the value of the BROWSERSTACK_USERNAME environment variable
			 */
			username?: string;
		}
	}

	export = BrowserStackTunnel;
}

declare module 'digdug/NullTunnel' {
	import Tunnel = require('digdug/Tunnel');

	class NullTunnel extends Tunnel {
		constructor(kwArgs?: NullTunnel.KwArgs);
	}

	module NullTunnel {
		export interface KwArgs extends Tunnel.KwArgs {
			/**
			 * An HTTP authorization string to use when initiating connections to the tunnel. This value of this property is
			 * defined by Tunnel subclasses.
			 */
			auth?: string;

			/**
			 * The host on which a WebDriver client can access the service provided by the tunnel. This may or may not be
			 * the host where the tunnel application is running.
			 *
			 * @default 'localhost'
			 */
			hostname?: string;

			/**
			 * The path that a WebDriver client should use to access the service provided by the tunnel.
			 *
			 * @default '/wd/hub/'
			 */
			pathname?: string;

			/**
			 * The local port where the WebDriver server should be exposed by the tunnel.
			 *
			 * @default 4444
			 */
			port?: number;

			/**
			 * The protocol (e.g., 'http') that a WebDriver client should use to access the service provided by the tunnel.
			 *
			 * @default 'http'
			 */
			protocol?: string;
		}
	}

	export = NullTunnel;
}

declare module 'digdug/SauceLabsTunnel' {
	import Tunnel = require('digdug/Tunnel');

	class SauceLabsTunnel extends Tunnel {
		/**
		 * The Sauce Labs access key.
		 *
		 * @default the value of the SAUCE_ACCESS_KEY environment variable
		 */
		accessKey: string;

		/**
		 * A list of domains that should not be proxied by the tunnel on the remote VM.
		 */
		directDomains: string[];

		/**
		 * A list of domains that will be proxied by the tunnel on the remote VM.
		 */
		tunnelDomains: string[];

		/**
		 * A list of URLs that require additional HTTP authentication. Only the hostname, port, and auth are used.
		 * This property is only supported by Sauce Connect 4 tunnels.
		 */
		domainAuthentication: string[];

		/**
		 * A list of regular expressions corresponding to domains whose connections should fail immediately if the VM
		 * attempts to make a connection to them.
		 */
		fastFailDomains: string[];

		/**
		 * Allows the tunnel to also be used by sub-accounts of the user that started the tunnel.
		 *
		 * @default false
		 */
		isSharedTunnel: boolean;

		/**
		 * A filename where additional logs from the tunnel should be output.
		 */
		logFile: string;

		/**
		 * A filename where Sauce Connect stores its process information.
		 */
		pidFile: string;

		/**
		 * Specifies the maximum log filesize before rotation, in bytes.
		 * This property is only supported by Sauce Connect 3 tunnels.
		 */
		logFileSize: number;

		/**
		 * Log statistics about HTTP traffic every `logTrafficStats` milliseconds.
		 * This property is only supported by Sauce Connect 4 tunnels.
		 *
		 * @default 0
		 */
		logTrafficStats: number;

		/**
		 * An alternative URL for the Sauce REST API.
		 * This property is only supported by Sauce Connect 3 tunnels.
		 */
		restUrl: string;

		/**
		 * A list of domains that should not have their SSL connections re-encrypted when going through the tunnel.
		 */
		skipSslDomains: string[];

		/**
		 * An additional set of options to use with the Squid proxy for the remote VM.
		 * This property is only supported by Sauce Connect 3 tunnels.
		 */
		squidOptions: string;

		/**
		 * Whether or not to use the proxy defined at {@link module:digdug/Tunnel#proxy} for the tunnel connection
		 * itself.
		 *
		 * @default false
		 */
		useProxyForTunnel: boolean;

		/**
		 * The Sauce Labs username.
		 *
		 * @default the value of the SAUCE_USERNAME environment variable
		 */
		username: string;

		/**
		 * Overrides the version of the VM created on Sauce Labs.
		 * This property is only supported by Sauce Connect 3 tunnels.
		 */
		vmVersion: string;

		constructor(kwArgs?: SauceLabsTunnel.KwArgs);
	}

	module SauceLabsTunnel {
		export interface KwArgs extends Tunnel.KwArgs {
			/**
			 * The Sauce Labs access key.
			 *
			 * @default the value of the SAUCE_ACCESS_KEY environment variable
			 */
			accessKey?: string;

			/**
			 * A list of domains that should not be proxied by the tunnel on the remote VM.
			 */
			directDomains?: string[];

			/**
			 * A list of domains that will be proxied by the tunnel on the remote VM.
			 */
			tunnelDomains?: string[];

			/**
			 * A list of URLs that require additional HTTP authentication. Only the hostname, port, and auth are used.
			 * This property is only supported by Sauce Connect 4 tunnels.
			 */
			domainAuthentication?: string[];

			/**
			 * A list of regular expressions corresponding to domains whose connections should fail immediately if the VM
			 * attempts to make a connection to them.
			 */
			fastFailDomains?: string[];

			/**
			 * Allows the tunnel to also be used by sub-accounts of the user that started the tunnel.
			 *
			 * @default false
			 */
			isSharedTunnel?: boolean;

			/**
			 * A filename where additional logs from the tunnel should be output.
			 */
			logFile?: string;

			/**
			 * A filename where Sauce Connect stores its process information.
			 */
			pidFile?: string;

			/**
			 * Specifies the maximum log filesize before rotation, in bytes.
			 * This property is only supported by Sauce Connect 3 tunnels.
			 */
			logFileSize?: number;

			/**
			 * Log statistics about HTTP traffic every `logTrafficStats` milliseconds.
			 * This property is only supported by Sauce Connect 4 tunnels.
			 *
			 * @default 0
			 */
			logTrafficStats?: number;

			/**
			 * An alternative URL for the Sauce REST API.
			 * This property is only supported by Sauce Connect 3 tunnels.
			 */
			restUrl?: string;

			/**
			 * A list of domains that should not have their SSL connections re-encrypted when going through the tunnel.
			 */
			skipSslDomains?: string[];

			/**
			 * An additional set of options to use with the Squid proxy for the remote VM.
			 * This property is only supported by Sauce Connect 3 tunnels.
			 */
			squidOptions?: string;

			/**
			 * Whether or not to use the proxy defined at {@link module:digdug/Tunnel#proxy} for the tunnel connection
			 * itself.
			 *
			 * @default false
			 */
			useProxyForTunnel?: boolean;

			/**
			 * The Sauce Labs username.
			 *
			 * @default the value of the SAUCE_USERNAME environment variable
			 */
			username?: string;

			/**
			 * Overrides the version of the VM created on Sauce Labs.
			 * This property is only supported by Sauce Connect 3 tunnels.
			 */
			vmVersion?: string;
		}
	}

	export = SauceLabsTunnel;
}

declare module 'digdug/TestingBotTunnel' {
	import Tunnel = require('digdug/Tunnel');

	class TestingBotTunnel extends Tunnel {
		/**
		 * The TestingBot API key.
		 *
		 * @default the value of the TESTINGBOT_API_KEY environment variable
		 */
		apiKey: string;

		/**
		 * The TestingBot API secret.
		 *
		 * @default the value of the TESTINGBOT_API_SECRET environment variable
		 */
		apiSecret: string;

		/**
		 * A list of regular expressions corresponding to domains whose connections should fail immediately if the VM
		 * attempts to make a connection to them.
		 */
		fastFailDomains: string[];

		/**
		 * A filename where additional logs from the tunnel should be output.
		 */
		logFile: string;

		/**
		 * Whether or not to use rabbIT compression for the tunnel connection.
		 *
		 * @default false
		 */
		useCompression: boolean;

		/**
		 * Whether or not to use the default local Jetty proxy for the tunnel.
		 *
		 * @default true
		 */
		useJettyProxy: boolean;

		/**
		 * Whether or not to use the default remote Squid proxy for the VM.
		 *
		 * @default true
		 */
		useSquidProxy: boolean;

		/**
		 * Whether or not to re-encrypt data encrypted by self-signed certificates.
		 *
		 * @default false
		 */
		useSsl: boolean;

		constructor(kwArgs?: TestingBotTunnel.KwArgs);
	}

	module TestingBotTunnel {
		export interface KwArgs extends Tunnel.KwArgs {
			/**
			 * The TestingBot API key.
			 *
			 * @default the value of the TESTINGBOT_API_KEY environment variable
			 */
			apiKey?: string;

			/**
			 * The TestingBot API secret.
			 *
			 * @default the value of the TESTINGBOT_API_SECRET environment variable
			 */
			apiSecret?: string;

			/**
			 * A list of regular expressions corresponding to domains whose connections should fail immediately if the VM
			 * attempts to make a connection to them.
			 */
			fastFailDomains?: string[];

			/**
			 * A filename where additional logs from the tunnel should be output.
			 */
			logFile?: string;

			/**
			 * Whether or not to use rabbIT compression for the tunnel connection.
			 *
			 * @default false
			 */
			useCompression?: boolean;

			/**
			 * Whether or not to use the default local Jetty proxy for the tunnel.
			 *
			 * @default true
			 */
			useJettyProxy?: boolean;

			/**
			 * Whether or not to use the default remote Squid proxy for the VM.
			 *
			 * @default true
			 */
			useSquidProxy?: boolean;

			/**
			 * Whether or not to re-encrypt data encrypted by self-signed certificates.
			 *
			 * @default false
			 */
			useSsl?: boolean;
		}
	}

	export = TestingBotTunnel;
}

declare module 'digdug/Tunnel' {
	import childProcess = require('child_process');
	import Promise = require('dojo/Promise');

	class Tunnel {
		/**
		 * The architecture the tunnel will run against. This information is automatically retrieved for the current
		 * system at runtime.
		 */
		architecture: string;

		/**
		 * An HTTP authorization string to use when initiating connections to the tunnel. This value of this property is
		 * defined by Tunnel subclasses.
		 */
		auth: string;

		/**
		 * The URL that a WebDriver client should used to interact with this service.
		 *
		 * @readonly
		 */
		clientUrl: string;

		/**
		 * The directory where the tunnel software will be extracted. If the directory does not exist, it will be
		 * created. This value is set by the tunnel subclasses.
		 */
		directory: string;

		/**
		 * The executable to spawn in order to create a tunnel. This value is set by the tunnel subclasses.
		 */
		executable: string;

		/**
		 * A map of additional capabilities that need to be sent to the provider when a new session is being created.
		 *
		 * @readonly
		 */
		extraCapabilities: {};

		/**
		 * The host on which a WebDriver client can access the service provided by the tunnel. This may or may not be
		 * the host where the tunnel application is running.
		 *
		 * @default 'localhost'
		 */
		hostname: string;

		/**
		 * Whether or not the tunnel software has already been downloaded.
		 *
		 * @readonly
		 */
		isDownloaded: boolean;

		/**
		 * Whether or not the tunnel is currently running.
		 *
		 * @readonly
		 */
		isRunning: boolean;

		/**
		 * Whether or not the tunnel is currently starting up.
		 *
		 * @readonly
		 */
		isStarting: boolean;

		/**
		 * Whether or not the tunnel is currently stopping.
		 *
		 * @readonly
		 */
		isStopping: boolean;

		/**
		 * The path that a WebDriver client should use to access the service provided by the tunnel.
		 *
		 * @default '/wd/hub/'
		 */
		pathname: string;

		/**
		 * The operating system the tunnel will run on. This information is automatically retrieved for the current
		 * system at runtime.
		 */
		platform: string;

		/**
		 * The local port where the WebDriver server should be exposed by the tunnel.
		 *
		 * @default 4444
		 */
		port: number;

		/**
		 * The protocol (e.g., 'http') that a WebDriver client should use to access the service provided by the tunnel.
		 *
		 * @default 'http'
		 */
		protocol: string;

		/**
		 * The URL of a proxy server for the tunnel to go through. Only the hostname, port, and auth are used.
		 */
		proxy: string;

		/**
		 * A unique identifier for the newly created tunnel.
		 */
		tunnelId: string;

		/**
		 * The URL where the tunnel software can be downloaded.
		 */
		url: string;

		/**
		 * Whether or not to tell the tunnel to provide verbose logging output.
		 *
		 * @default false
		 */
		verbose: boolean;

		constructor(kwArgs?: Tunnel.KwArgs);

		/**
		 * Adds an event listener to the tunnel.
		 */
		on: Tunnel.Events;

		/**
		 * Downloads and extracts the tunnel software if it is not already downloaded.
		 *
		 * This method can be extended by implementations to perform any necessary post-processing, such as setting
		 * appropriate file permissions on the downloaded executable.
		 *
		 * @param forceDownload Force downloading the software even if it already has been downloaded.
		 * @returns A promise that resolves once the download and extraction process has completed.
		 */
		download(forceDownload: boolean): Promise<void>;

		/**
		 * Creates the list of command-line arguments to be passed to the spawned tunnel. Implementations should
		 * override this method to provide the appropriate command-line arguments.
		 *
		 * Arguments passed to {@link module:digdug/Tunnel#_makeChild} will be passed as-is to this method.
		 *
		 * @returns A list of command-line arguments.
		 */
		protected _makeArgs(): string[];

		/**
		 * Creates a newly spawned child process for the tunnel software. Implementations should call this method to
		 * create the tunnel process.
		 *
		 * Arguments passed to this method will be passed as-is to {@link module:digdug/Tunnel#_makeArgs} and
		 * {@link module:digdug/Tunnel#_makeOptions}.
		 *
		 * @returns An object containing a newly spawned Process and a Deferred that will be resolved once the tunnel
		 * has started successfully.
		 */
		protected _makeChild(): { process: childProcess.ChildProcess; deferred: Promise.Deferred<void>; };

		/**
		 * Creates the set of options to use when spawning the tunnel process. Implementations should override this
		 * method to provide the appropriate options for the tunnel software.
		 *
		 * Arguments passed to {@link module:digdug/Tunnel#_makeChild} will be passed as-is to this method.
		 *
		 * @returns A set of options matching those provided to Node.js {@link module:child_process.spawn}.
		 */
		protected _makeOptions(): {
			cwd?: string;
			stdio?: any;
			custom?: any;
			env?: any;
			detached?: boolean;
		};

		/**
		 * Sends information about a job to the tunnel provider.
		 *
		 * @param jobId The job to send data about. This is usually a session ID.
		 * @param data Data to send to the tunnel provider about the job.
		 * @returns A promise that resolves once the job state request is complete.
		 */
		sendJobState(jobId: string, data: digdug.JobState): Promise<void>;

		/**
		 * Starts the tunnel, automatically downloading dependencies if necessary.
		 *
		 * @returns A promise that resolves once the tunnel has been established.
		 */
		start(): Promise<void>;

		/**
		 * This method provides the implementation that actually starts the tunnel and any other logic for emitting
		 * events on the Tunnel based on data passed by the tunnel software.
		 *
		 * The default implementation that assumes the tunnel is ready for use once the child process has written to
		 * `stdout` or `stderr`. This method should be reimplemented by other tunnel launchers to implement correct
		 * launch detection logic.
		 *
		 * @returns
		 * An object containing a reference to the child process, and a Deferred that is resolved once the tunnel is
		 * ready for use. Normally this will be the object returned from a call to `Tunnel#_makeChild`.
		 */
		protected _start(): {
			process: childProcess.ChildProcess;
			deferred: Promise.Deferred<void>;
		};

		/**
		 * Stops the tunnel.
		 *
		 * @returns A promise that resolves to the exit code for the tunnel once it has been terminated.
		 */
		stop(): Promise<number>;

		/**
		 * This method provides the implementation that actually stops the tunnel.
		 *
		 * The default implementation that assumes the tunnel has been closed once the child process has exited. This
		 * method should be reimplemented by other tunnel launchers to implement correct shutdown logic, if necessary.
		 *
		 * @returns A promise that resolves once the tunnel has shut down.
		 */
		protected _stop(): Promise<void>;
	}

	module Tunnel {
		export interface KwArgs {
			/**
			 * The URL of a proxy server for the tunnel to go through. Only the hostname, port, and auth are used.
			 */
			proxy?: string;

			/**
			 * A unique identifier for the newly created tunnel.
			 */
			tunnelId?: string;

			/**
			 * Whether or not to tell the tunnel to provide verbose logging output.
			 *
			 * @default false
			 */
			verbose?: boolean;
		}

		export interface Events {
			/**
			 * Part of the tunnel has been downloaded from the server.
			 */
			(eventName: 'downloadprogress', listener: digdug.Listener<{ received: number; total: number; }>): digdug.Handle;

			/**
			 * A chunk of raw string data output by the tunnel software to stdout.
			 */
			(eventName: 'stdout', listener: digdug.Listener<string>): digdug.Handle;

			/**
			 * A chunk of raw string data output by the tunnel software to stderr.
			 */
			(eventName: 'stderr', listener: digdug.Listener<string>): digdug.Handle;

			/**
			 * Information about the status of the tunnel setup process that is suitable for presentation to end-users.
			 */
			(eventName: 'status', listener: digdug.Listener<string>): digdug.Handle;

			/**
			 * Adds an event listener to the tunnel.
			 */
			(eventName: string, listener: digdug.Listener<any>): digdug.Handle;
		}
	}

	export = Tunnel;
}

declare module 'digdug/util' {
	/**
	 * Adds properties from source objects to a target object using ES5 `Object.defineProperty` instead of
	 * `[[Set]]`. This is necessary when copying properties that are ES5 accessor/mutators.
	 *
	 * @param target The object to which properties are added.
	 * @param sources The source objects from which properties are taken.
	 * @returns The target object.
	 */
	export function mixin<T>(target: {}, ...sources: {}[]): T;

	/**
	 * Attaches an event to a Node.js EventEmitter and returns a handle for removing the listener later.
	 *
	 * @param emitter A Node.js EventEmitter object.
	 * @param event The name of the event to listen for.
	 * @param listener The event listener that will be invoked when the event occurs.
	 * @returns A remove handle.
	 */
	export function on(emitter: NodeJS.EventEmitter, event: string, listener: Function): digdug.Handle;
}
