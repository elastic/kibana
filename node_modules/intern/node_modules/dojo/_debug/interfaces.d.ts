export interface IArrayObserver<T> {
	(index: number, inserted: IObservableArray<T>, removedItems: IObservableArray<T>): void;
}

export interface IDateObject {
	dayOfMonth: number;
	dayOfWeek: number;
	daysInMonth: number;
	hours: number;
	isLeapYear: boolean;
	milliseconds: number;
	minutes: number;
	month: number;
	seconds: number;
	year: number;
}

export interface IDateObjectArguments extends IDateObjectOperationArguments {
	month: number;
	year: number;
}

export interface IDateObjectOperationArguments {
	dayOfMonth?: number;
	hours?: number;
	milliseconds?: number;
	minutes?: number;
	month?: number;
	seconds?: number;
	year?: number;
}

export interface IHandle {
	remove(): void;
}

export interface IObservable {
	observe<T>(property: string, observer: IObserver<T>): IHandle;
}

export interface IObservableArray<T> {
	[index: number]: T;
	observe(observer: IArrayObserver<T>): IHandle;
	set(index: number, value: T): void;
}

export interface IObserver<T> {
	(newValue: T, oldValue: T): void;
}
