const SANDBOX_KEY = 'PRODFILER_SANDBOX_FEATURE_FLAG'
const ENABLED_KEY = 'true'

const setSandboxModeTo = (newValue: string) => {
  localStorage.setItem(SANDBOX_KEY, newValue)
  window.location.reload()
}
export const isSandboxEnabled = () => {
  return localStorage.getItem(SANDBOX_KEY) === ENABLED_KEY
}

export const toggleSandboxMode = () => {
  if (isSandboxEnabled()) {
    setSandboxModeTo('')
  } else {
    setSandboxModeTo(ENABLED_KEY)
  }
}
