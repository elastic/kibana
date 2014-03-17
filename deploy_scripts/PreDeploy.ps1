function Add-ServerRole
{
  param([string] $roleToAdd)
  
  $searchResult = Get-WindowsFeature $roleToAdd
  
  if($searchResult -eq $null)
  {
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
