/// <reference path="../node/node.d.ts" />
declare module 'dojo/interfaces' {
	export interface IArrayObserver<T> {
		(index:number, inserted:IObservableArray<T>, removedItems:IObservableArray<T>):void;
	}

	export interface IDateObject {
		dayOfMonth:number;
		dayOfWeek:number;
		daysInMonth:number;
		hours:number;
		isLeapYear:boolean;
		milliseconds:number;
		minutes:number;
		month:number;
		seconds:number;
		year:number;
	}

	export interface IDateObjectArguments extends IDateObjectOperationArguments {
		month:number;
		year:number;
	}

	export interface IDateObjectOperationArguments {
		dayOfMonth?:number;
		hours?:number;
		milliseconds?:number;
		minutes?:number;
		month?:number;
		seconds?:number;
		year?:number;
	}

	export interface IHandle {
		remove():void;
	}

	export interface IObservable {
		observe<T>(property:string, observer:IObserver<T>):IHandle;
	}

	export interface IObservableArray<T> {
		[index:number]:T;
		observe(observer:IArrayObserver<T>):IHandle;
		set(index:number, value:T):void;
	}

	export interface IObserver<T> {
		(newValue:T, oldValue:T):void;
	}

}
declare module 'dojo/aspect' {
	import core = require('dojo/interfaces');
	export function after(target: any, methodName: string, advice: Function): core.IHandle;
	export function around(target: any, methodName: string, advice: (previous: Function) => Function): core.IHandle;
	export function before(target: any, methodName: string, advice: Function): core.IHandle;
	export function on(target: any, methodName: string, advice: Function): core.IHandle;

}
declare module 'dojo/Evented' {
	import core = require('dojo/interfaces'); class Evented {
	    on(type: string, listener: (...args: any[]) => void): core.IHandle;
	    emit(type: string, ...args: any[]): boolean;
	}
	export = Evented;

}
declare module 'dojo/on' {
	import core = require('dojo/interfaces');
	import Evented = require('dojo/Evented'); module on {
	    interface IExtensionEvent {
	        (target: any, listener: EventListener): core.IHandle;
	    }
	    interface IOnAddListener {
	        (target: any, type: string, listener: Function, capture?: boolean): core.IHandle;
	    }
	}
	interface on {
	    (target: HTMLElement, type: string, listener: EventListener, capture?: boolean): core.IHandle;
	    (target: HTMLElement, type: on.IExtensionEvent, listener: EventListener, capture?: boolean): core.IHandle;
	    (target: Evented, type: string, listener: EventListener, capture?: boolean): core.IHandle;
	    (target: Evented, type: on.IExtensionEvent, listener: EventListener, capture?: boolean): core.IHandle;
	    parse(target: HTMLElement, type: string, listener: EventListener, context: any, addListener: on.IOnAddListener, capture?: boolean): core.IHandle;
	    parse(target: HTMLElement, type: on.IExtensionEvent, listener: EventListener, context: any, addListener: on.IOnAddListener, capture?: boolean): core.IHandle;
	    parse(target: Evented, type: string, listener: EventListener, context: any, addListener: on.IOnAddListener, capture?: boolean): core.IHandle;
	    parse(target: Evented, type: on.IExtensionEvent, listener: EventListener, context: any, addListener: on.IOnAddListener, capture?: boolean): core.IHandle;
	    emit(target: HTMLElement, type: string, event?: Object): boolean;
	    emit(target: Evented, type: string, event?: Object): boolean;
	} var on: on;
	export = on;

}
declare module 'dojo/CallbackQueue' {
	import core = require('dojo/interfaces'); class CallbackQueue<T extends Function> {
	    private _callbacks;
	    add(callback: T): core.IHandle;
	    drain(...args: any[]): void;
	}
	export = CallbackQueue;

}
declare module 'dojo/loader' {
	import has = require('dojo/has');
	export interface IConfig {
	    baseUrl?: string;
	    map?: IModuleMap;
	    packages?: IPackage[];
	    paths?: {
	        [path: string]: string;
	    };
	}
	export interface IDefine {
	    (moduleId: string, dependencies: string[], factory: IFactory): void;
	    (dependencies: string[], factory: IFactory): void;
	    (factory: IFactory): void;
	    (value: any): void;
	}
	export interface IFactory {
	    (...modules: any[]): any;
	}
	export interface ILoaderPlugin {
	    dynamic?: boolean;
	    load?: (resourceId: string, require: IRequire, load: (value?: any) => void, config?: Object) => void;
	    normalize?: (moduleId: string, normalize: (moduleId: string) => string) => string;
	}
	export interface IMapItem extends Array<any> {
	    0: string;
	    1: any;
	    2: RegExp;
	    3: number;
	}
	export interface IMapReplacement extends IMapItem {
	    1: string;
	}
	export interface IMapRoot extends Array<IMapSource> {
	    star?: IMapSource;
	}
	export interface IMapSource extends IMapItem {
	    1: IMapReplacement[];
	}
	export interface IModule extends ILoaderPlugin {
	    cjs: {
	        exports: any;
	        id: string;
	        setExports: (exports: any) => void;
	        uri: string;
	    };
	    def: IFactory;
	    deps: IModule[];
	    executed: any;
	    injected: boolean;
	    fix?: (module: IModule) => void;
	    gc: boolean;
	    mid: string;
	    pack: IPackage;
	    req: IRequire;
	    require?: IRequire;
	    result: any;
	    url: string;
	    loadQ?: IModule[];
	    plugin?: IModule;
	    prid: string;
	}
	export interface IModuleMap extends IModuleMapItem {
	    [sourceMid: string]: IModuleMapReplacement;
	}
	export interface IModuleMapItem {
	    [mid: string]: any;
	}
	export interface IModuleMapReplacement extends IModuleMapItem {
	    [findMid: string]: string;
	}
	export interface IPackage {
	    location?: string;
	    main?: string;
	    name?: string;
	}
	export interface IPackageMap {
	    [packageId: string]: IPackage;
	}
	export interface IPathMap extends IMapReplacement {
	}
	export interface IRequire {
	    (config: IConfig, dependencies?: string[], callback?: IRequireCallback): void;
	    (dependencies: string[], callback: IRequireCallback): void;
	    <ModuleType>(moduleId: string): ModuleType;
	    toAbsMid(moduleId: string): string;
	    toUrl(path: string): string;
	}
	export interface IRequireCallback {
	    (...modules: any[]): void;
	}
	export interface IRootRequire extends IRequire {
	    config(config: IConfig): void;
	    has: has;
	    inspect?(name: string): any;
	    nodeRequire?(id: string): any;
	    signal(type: string, data: any[]): void;
	    undef(moduleId: string): void;
	}

}
declare module 'dojo/has' {
	import loader = require('dojo/loader'); module has {
	    interface IHas {
	        (name: string): any;
	        add(name: string, value: (global: Window, document?: HTMLDocument, element?: HTMLDivElement) => any, now?: boolean, force?: boolean): void;
	        add(name: string, value: any, now?: boolean, force?: boolean): void;
	    }
	}
	interface has extends has.IHas, loader.ILoaderPlugin {
	} var has: has;
	export = has;

}
declare module 'dojo/nextTick' {
	import core = require('dojo/interfaces'); var nextTick: (callback: () => void) => core.IHandle;
	export = nextTick;

}
declare module 'dojo/kernel' {
	export interface IVersion {
	    major?: number;
	    minor?: number;
	    patch?: number;
	    flag?: string;
	    revision?: string;
	}
	export var version: IVersion;

}
declare module 'dojo/DateObject' {
	import core = require('dojo/interfaces'); class DateObject implements core.IDateObject {
	    static parse(string: string): DateObject;
	    static now(): DateObject;
	    private _date;
	    utc: core.IDateObject;
	    constructor(value: number);
	    constructor(value: string);
	    constructor(value: Date);
	    constructor(value: core.IDateObjectArguments);
	    constructor();
	    isLeapYear: boolean;
	    daysInMonth: number;
	    year: number;
	    month: number;
	    dayOfMonth: number;
	    hours: number;
	    minutes: number;
	    seconds: number;
	    milliseconds: number;
	    time: number;
	    dayOfWeek: number;
	    timezoneOffset: number;
	    add(value: core.IDateObjectOperationArguments): DateObject;
	    toString(): string;
	    toDateString(): string;
	    toTimeString(): string;
	    toLocaleString(): string;
	    toLocaleDateString(): string;
	    toLocaleTimeString(): string;
	    toISOString(): string;
	    toJSON(key?: any): string;
	    valueOf(): number;
	}
	export = DateObject;

}
declare module 'dojo/io-query' {
	/**
	 * @module dojo/io-query
	 *
	 * This module defines query string processing functions.
	 */
	/**
	 * Takes a name/value mapping object and returns a string representing a URL-encoded version of that object.
	 * example:
	 *     this object:
	 *
	 *     | {
	 *     |     blah: "blah",
	 *     |     multi: [
	 *     |         "thud",
	 *     |         "thonk"
	 *     |     ]
	 *     | };
	 *
	 *      yields the following query string:
	 *
	 *     | "blah=blah&multi=thud&multi=thonk"
	 */
	export function objectToQuery(map: {}): string;

}
declare module 'dojo/lang' {
	export function setProperty(object: any, propertyName: string, value: any): void;
	export function getProperty(object: any, propertyName: string, create?: boolean): any;
	export function mixin<T extends Object>(target: T, ...sources: any[]): T;
	export function mixin<T extends Object>(target: any, ...sources: any[]): T;
	export function delegate<T extends Object>(object: T, properties?: any): T;
	export function delegate<T extends Object>(object: any, properties?: any): T;
	export function bind<T extends Function>(context: any, fn: Function, ...extra: any[]): T;
	export function bind<T extends Function>(context: any, method: string, ...extra: any[]): T;
	export function partial<T extends Function>(fn: Function, ...extra: any[]): T;
	export function deepMixin<T extends Object>(target: T, source: any): T;
	export function deepMixin<T extends Object>(target: any, source: any): T;
	export function deepDelegate<T extends Object>(source: T, properties?: any): T;
	export function deepDelegate<T extends Object>(source: any, properties?: any): T;
	export function isEqual(a: any, b: any): boolean;
	export var getPropertyDescriptor: (object: any, property: string) => PropertyDescriptor;
	export function pullFromArray<T>(haystack: T[], needle: T): T[];

}
declare module 'dojo/string' {
	export function repeat(string: string, times: number): string;
	export function pad(text: string, size: number, character?: string): string;
	export function padr(text: string, size: number, character?: string): string;
	export function padl(text: string, size: number, character?: string): string;
	export interface ITransform {
	    (value: any, key?: string): any;
	}
	export function substitute(template: string, map: Object, transform?: ITransform, context?: any): string;
	export function substitute(template: string, map: Array<any>, transform?: ITransform, context?: any): string;
	export function count(haystack: string, needle: string): number;
	export function escapeRegExpString(string: string): string;

}
declare module 'dojo/cookie' {
	export interface IOptions {
	    expires?: any;
	    maxAge?: number;
	    path?: string;
	    domain?: string;
	    secure?: boolean;
	}
	export function key(index: number): string;
	export function getItem(key: string): string;
	export function setItem(key: string, data: string, options?: IOptions): void;
	export function removeItem(key: string, options?: IOptions): void;

}
declare module 'dojo/Promise' {
	 class Promise<T> {
	    /**
	     * Converts an iterable object containing promises into a single promise that resolves to a new iterable object
	     * containing all the fulfilled properties of the original object. Properties that do not contain promises are
	     * passed through as-is.
	     *
	     * @example
	     * Promise.all([ Promise.resolve('foo'), 'bar' ]).then(function (value) {
	     *   value[0] === 'foo'; // true
	     *   value[1] === 'bar'; // true
	     * });
	     *
	     * @example
	     * Promise.all({
	     *   foo: Promise.resolve('foo'),
	     *   bar: 'bar'
	     * }).then(function (value) {
	     *   value.foo === 'foo'; // true
	     *   value.bar === 'bar'; // true
	     * });
	     */
	    static all<T>(iterable: {
	        [key: string]: Promise.Thenable<T> | T;
	    }): Promise<{
	        [key: string]: T;
	    }>;
	    static all<T>(iterable: Array<Promise.Thenable<T> | T>): Promise<T[]>;
	    /**
	     * Creates a new promise that is pre-rejected with the given error.
	     */
	    static reject(error?: Error): Promise<any>;
	    /**
	     * Creates a new promise that is pre-resolved with the given value. If the passed value is already a promise, it
	     * will be returned as-is.
	     */
	    static resolve<T>(value: Promise.Thenable<T> | T): Promise<T>;
	    /**
	     * Creates a new Promise.
	     *
	     * @constructor
	     *
	     * @param initializer
	     * The initializer function is called immediately when the Promise is instantiated. It is responsible for starting
	     * the asynchronous operation when it is invoked.
	     *
	     * The initializer must call either the passed `resolve` function when the asynchronous operation has completed
	     * successfully, or the `reject` function when the operation fails, unless the the `canceler` is called first.
	     *
	     * The `progress` function can also be called zero or more times to provide information about the process of the
	     * operation to any interested consumers.
	     *
	     * Finally, the initializer can register an canceler function that cancels the asynchronous operation by passing
	     * the canceler function to the `setCanceler` function.
	     */
	    constructor(initializer: (resolve?: (value?: Promise.Thenable<T> | T) => void, reject?: (error?: Error) => void, progress?: (data?: any) => void, setCanceler?: (canceler: Promise.Canceler) => void) => void);
	    /**
	     * The current state of the promise.
	     *
	     * @readonly
	     */
	    state: Promise.State;
	    /**
	     * Cancels any pending asynchronous operation of the promise.
	     *
	     * @method
	     * @param reason
	     * A specific reason for failing the operation. If no reason is provided, a default `CancelError` error will be
	     * used.
	     */
	    cancel: (reason?: Error, source?: Promise<any>) => void;
	    /**
	     * Adds a callback to the promise to be invoked when the asynchronous operation throws an error.
	     */
	    catch<U>(onRejected: (error?: Error) => Promise.Thenable<U> | U): Promise<U>;
	    /**
	     * Adds a callback to the promise to be invoked regardless of whether or not the asynchronous operation completed
	     * successfully.
	     */
	    finally<U>(onFulfilledOrRejected: (value?: T | Error) => Promise.Thenable<U> | U): Promise<U>;
	    /**
	     * Adds a callback to the promise to be invoked when progress occurs within the asynchronous operation.
	     */
	    progress(onProgress: (data?: any) => any): Promise<T>;
	    /**
	     * Adds a callback to the promise to be invoked when the asynchronous operation completes successfully.
	     */
	    then: <U>(onFulfilled?: (value?: T) => Promise.Thenable<U> | U, onRejected?: (error?: Error) => Promise.Thenable<U> | U, onProgress?: (data?: any) => any) => Promise<U>;
	} module Promise {
	    interface Canceler {
	        (reason: Error): any;
	    }
	    /**
	     * The Deferred class unwraps a promise in order to expose its internal state management functions.
	     */
	    class Deferred<T> {
	        /**
	         * The underlying promise for the Deferred.
	         */
	        promise: Promise<T>;
	        constructor(canceler?: Promise.Canceler);
	        /**
	         * Sends progress information for the underlying promise.
	         *
	         * @method
	         * @param data Additional information about the asynchronous operation’s progress.
	         */
	        progress: (data?: any) => void;
	        /**
	         * Rejects the underlying promise with an error.
	         *
	         * @method
	         * @param error The error that should be used as the fulfilled value for the promise.
	         */
	        reject: (error?: Error) => void;
	        /**
	         * Resolves the underlying promise with a value.
	         *
	         * @method
	         * @param value The value that should be used as the fulfilled value for the promise.
	         */
	        resolve: (value?: Promise.Thenable<T> | T) => void;
	    }
	    /**
	     * The State enum represents the possible states of a promise.
	     */
	    enum State {
	        PENDING = 0,
	        FULFILLED = 1,
	        REJECTED = 2,
	    }
	    interface Thenable<T> {
	        then<U>(onFulfilled?: (value?: T) => Promise.Thenable<U> | U, onRejected?: (error?: Error) => Promise.Thenable<U> | U): Promise.Thenable<U>;
	    }
	}
	export = Promise;

}
declare module 'dojo/Registry' {
	import core = require('dojo/interfaces'); module Registry {
	    interface ITest {
	        (...args: any[]): boolean;
	    }
	} class Registry<ValueT> {
	    private _entries;
	    private _defaultValue;
	    constructor(defaultValue?: ValueT);
	    match(...args: any[]): ValueT;
	    register(test: Registry.ITest, value: ValueT, first?: boolean): core.IHandle;
	}
	export = Registry;

}
declare module 'dojo/request' {
	import Promise = require('dojo/Promise');
	import Registry = require('dojo/Registry'); module request {
	    interface IRequestError extends Error {
	        response: request.IResponse;
	    }
	    interface IRequestFilter {
	        (response: IResponse, url: string, options: IRequestOptions): any;
	    }
	    interface IRequestOptions {
	        auth?: string;
	        cacheBust?: any;
	        data?: any;
	        headers?: {
	            [name: string]: string;
	        };
	        method?: string;
	        password?: string;
	        query?: string;
	        responseType?: string;
	        timeout?: number;
	        user?: string;
	    }
	    interface IRequestPromise extends Promise<IResponse> {
	        data: Promise<any>;
	    }
	    interface IRequestProvider {
	        (url: string, options: IRequestOptions): IRequestPromise;
	    }
	    interface IResponse {
	        data: any;
	        getHeader(name: string): string;
	        nativeResponse?: any;
	        requestOptions: IRequestOptions;
	        statusCode: number;
	        url: string;
	    }
	}
	interface request extends request.IRequestProvider {
	    filterRegistry: Registry<request.IRequestFilter>;
	    providerRegistry: Registry<request.IRequestProvider>;
	    delete(url: string, options?: request.IRequestOptions): request.IRequestPromise;
	    get(url: string, options?: request.IRequestOptions): request.IRequestPromise;
	    post(url: string, options?: request.IRequestOptions): request.IRequestPromise;
	    put(url: string, options?: request.IRequestOptions): request.IRequestPromise;
	} var request: request;
	export = request;

}
declare module 'dojo/request/xhr' {
	import Promise = require('dojo/Promise');
	import request = require('dojo/request'); module xhr {
	    interface IRequestOptions extends request.IRequestOptions {
	        blockMainThread?: boolean;
	    }
	    interface IResponse extends request.IResponse {
	        statusText: string;
	    }
	} function xhr(url: string, options?: xhr.IRequestOptions): Promise<xhr.IResponse>;
	export = xhr;

}
declare module 'dojo/request/node' {
	import Promise = require('dojo/Promise');
	import request = require('dojo/request'); module node {
	    interface INodeRequestOptions extends request.IRequestOptions {
	        agent?: any;
	        ca?: any;
	        cert?: string;
	        ciphers?: string;
	        dataEncoding?: string;
	        followRedirects?: boolean;
	        key?: string;
	        localAddress?: string;
	        passphrase?: string;
	        pfx?: any;
	        proxy?: string;
	        rejectUnauthorized?: boolean;
	        secureProtocol?: string;
	        socketPath?: string;
	        socketOptions?: {
	            keepAlive?: number;
	            noDelay?: boolean;
	            timeout?: number;
	        };
	        streamData?: boolean;
	        streamEncoding?: string;
	        streamTarget?: any;
	    }
	} function node(url: string, options?: node.INodeRequestOptions): Promise<request.IResponse>;
	export = node;

}
declare module 'dojo/Scheduler' {
	import core = require('dojo/interfaces'); class Scheduler {
	    static schedule(callback: () => void): core.IHandle;
	    private _callbacks;
	    schedule(callback: () => void): core.IHandle;
	}
	export = Scheduler;

}
declare module 'dojo/Observable' {
	import core = require('dojo/interfaces'); class Observable implements core.IObservable {
	    private _callbacks;
	    private _notifications;
	    private _timer;
	    constructor(props?: any);
	    private _dispatch();
	    _isEqual(a: any, b: any): boolean;
	    private _notify<T>(property, newValue, oldValue);
	    observe<T>(property: string, callback: core.IObserver<T>): core.IHandle;
	    _schedule(): void;
	}
	export = Observable;

}
declare module 'dojo/ObservableProperty' {
	import core = require('dojo/interfaces');
	import Observable = require('dojo/Observable'); class ObservableProperty<T> extends Observable {
	    private _observable;
	    private _propertyName;
	    private _handle;
	    value: T;
	    constructor(observable: core.IObservable, property: string);
	    destroy(): void;
	    _schedule(): void;
	}
	export = ObservableProperty;

}
declare module 'dojo/domReady' {
	import loader = require('dojo/loader');
	interface domReady extends loader.ILoaderPlugin {
	    (callback: () => void): void;
	} var domReady: domReady;
	export = domReady;

}
declare module 'dojo/topic' {
	import core = require('dojo/interfaces');
	export function subscribe(topic: string, listener: (...args: any[]) => void): core.IHandle;
	export function publish(topic: string, ...args: any[]): void;

}
declare module 'dojo/text' {
	import loader = require('dojo/loader');
	export function load(resourceId: string, require: loader.IRequire, load: (value?: any) => void): void;

}
declare module 'dojo/on/once' {
	import on = require('dojo/on'); function once(type: string): on.IExtensionEvent;
	export = once;

}
declare module 'dojo/on/pausable' {
	import core = require('dojo/interfaces');
	import on = require('dojo/on'); module pausable {
	    interface IPausableHandle extends core.IHandle {
	        pause(): void;
	        resume(): void;
	    }
	} function pausable(type: string): on.IExtensionEvent;
	export = pausable;

}
declare module 'dojo/ObservableArray' {
	import core = require('dojo/interfaces'); class ObservableArray<T> implements core.IObservableArray<T> {
	    [index: number]: T;
	    length: number;
	    static from<U>(items: U[]): ObservableArray<U>;
	    constructor(length?: number);
	    concat<U extends T[]>(...items: U[]): ObservableArray<T>;
	    concat<U extends ObservableArray<T>>(...items: U[]): ObservableArray<T>;
	    concat(...items: T[]): ObservableArray<T>;
	    every(callback: (value: T, index: number, array: ObservableArray<T>) => boolean, thisObject?: any): boolean;
	    filter(callback: (value: T, index: number, array: ObservableArray<T>) => boolean, thisObject?: any): ObservableArray<T>;
	    forEach(callback: (value: T, index: number, array: ObservableArray<T>) => void, thisObject?: any): void;
	    indexOf(searchElement: T, fromIndex?: number): number;
	    join(separator?: string): string;
	    lastIndexOf(searchElement: T, fromIndex?: number): number;
	    map<U>(callback: (value: T, index: number, array: ObservableArray<T>) => U, thisObject?: any): ObservableArray<U>;
	    observe(observer: core.IArrayObserver<T>): core.IHandle;
	    pop(): T;
	    push(...items: T[]): number;
	    reduce(callback: (previousValue: T, currentValue: T, currentIndex: number, array: T[]) => T, initialValue?: T): T;
	    reduce<U>(callback: (previousValue: U, currentValue: T, currentIndex: number, array: T[]) => U, initialValue: U): U;
	    reduceRight(callback: (previousValue: T, currentValue: T, currentIndex: number, array: T[]) => T, initialValue?: T): T;
	    reduceRight<U>(callback: (previousValue: U, currentValue: T, currentIndex: number, array: T[]) => U, initialValue: U): U;
	    reverse(): ObservableArray<T>;
	    set(index: number, value: T): void;
	    shift(): T;
	    slice(start: number, end?: number): ObservableArray<T>;
	    some(callback: (value: T, index: number, array: ObservableArray<T>) => boolean, thisObject?: any): boolean;
	    sort(compare?: (a: T, b: T) => number): ObservableArray<T>;
	    splice(start: number): ObservableArray<T>;
	    splice(start: number, deleteCount: number, ...items: T[]): ObservableArray<T>;
	    unshift(...items: T[]): number;
	}
	export = ObservableArray;

}
declare module 'dojo/dom' {
	export function get(id: HTMLElement, doc?: Document): HTMLElement;
	export function get(id: string, doc?: Document): HTMLElement;

}
