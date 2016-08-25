export default function DelayedUpdaterFactory($http, chrome, Promise) {
  let unsavedChanges = {};
  let unresolvedPromises = [];
  let saveTimeout = null;

  return function delayedUpdate(key, value) {
    unsavedChanges[key] = value;

    return new Promise(saveSoon)
      .then(res => res.data.settings);
  };

  function saveSoon(resolve, reject) {
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }

    saveTimeout = setTimeout(fire, 200);
    unresolvedPromises.push({ resolve, reject });
  }

  function fire() {
    const changes = unsavedChanges;
    const promises = unresolvedPromises;

    unresolvedPromises = [];
    unsavedChanges = {};

    persist(changes)
      .then(result => settle(promises, `resolve`, result))
      .catch(reason => settle(promises, `reject`, reason));
  }

  function settle(listeners, decision, data) {
    listeners.forEach(listener => listener[decision](data));
  }

  function persist(changes) {
    const keys = Object.keys(changes);
    if (keys.length === 1) {
      const [key] = keys;
      const value = changes[key];
      const update = value === null ? remove : edit;
      return update(key, value);
    }
    return editMany(changes);
  }

  function remove(key) {
    return sync(`delete`, { postfix: `/${key}` });
  }

  function edit(key, value) {
    return sync(`post`, { postfix: `/${key}`, data: { value } });
  }

  function editMany(changes) {
    return sync(`post`, { data: { changes } });
  }

  function sync(method, { postfix = '', data } = {}) {
    return $http({
      method,
      url: chrome.addBasePath(`/api/kibana/settings${postfix}`),
      data
    });
  }
}
