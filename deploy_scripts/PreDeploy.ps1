function Add-ServerRole
{
  param([string] $roleToAdd)
  
  Write-Host "looking for server role: $roleToAdd"
  $searchResult = Get-WindowsFeature $roleToAdd
  
  if($searchResult.Installed -eq $false)
  {
	Write-Host "Adding server role: $roleToAdd"
	Add-WindowsFeature $roleToAdd
  }
}

function Add-IISMimeType
{
  param(
    [Parameter(Mandatory=$true)][string] $mimeType,
    [Parameter(Mandatory=$true)][string] $mimeFileExtension
  )
  Import-Module WebAdministration
  
  $mimePresent =  get-webconfigurationproperty //staticContent -name collection | Where { $_.mimeType -eq $mimeType -And $_.fileExtension -eq $mimeFileExtension }
  
  if ( $mimePresent -eq $null)
  {
  	add-webconfigurationproperty //staticContent -name collection -value @{fileExtension=$mimeFileExtension; mimeType=$mimeType}
  	Write-Host "MimeType added to IIS: '$mimeType', '$mimeFileExtension'"
  }
  else
  {
  	Write-Host "MimeType allready present in IIS: '$mimeType', '$mimeFileExtension'"
  }
}

Import-Module Servermanager

Add-ServerRole Application-Server
Add-ServerRole Web-Server

Add-IISMimeType "application/json" ".json"
