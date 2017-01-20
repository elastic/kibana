export const mutateWithId = (id, value) => {return {id, value};};
export const mutateWithIdAndName = (id, name, value) => {return {id, name, value};};
export const mutateElement = mutateWithId;
export const mutateArgument = mutateWithIdAndName;
